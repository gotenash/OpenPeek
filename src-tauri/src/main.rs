// Prevents additional console window on Windows, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
pub struct SystemMonitor {
    pub id: String,
    pub name: String,
    pub is_primary: bool,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub scale_factor: f64,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct ScreenPreference {
    pub selected_screen: String, // "prompt" | "screen1" | "screen2"
}

static ACTIVE_MONITOR_TARGET: Mutex<Option<String>> = Mutex::new(None);

fn get_config_file_path() -> std::path::PathBuf {
    if let Some(app_data) = std::env::var_os("APPDATA") {
        let dir = std::path::PathBuf::from(app_data).join("OpenPeek");
        let _ = std::fs::create_dir_all(&dir);
        dir.join("screen_config.json")
    } else {
        std::path::PathBuf::from("screen_config.json")
    }
}

fn load_screen_preference() -> String {
    let path = get_config_file_path();
    if let Ok(data) = std::fs::read_to_string(&path) {
        if let Ok(pref) = serde_json::from_str::<ScreenPreference>(&data) {
            return pref.selected_screen;
        }
    }
    "prompt".to_string()
}

fn save_screen_preference_to_disk(pref: &str) {
    let path = get_config_file_path();
    let pref_obj = ScreenPreference {
        selected_screen: pref.to_string(),
    };
    if let Ok(json) = serde_json::to_string_pretty(&pref_obj) {
        let _ = std::fs::write(path, json);
    }
}

#[cfg(windows)]
unsafe extern "system" fn enum_monitors_callback(
    h_monitor: windows_sys::Win32::Graphics::Gdi::HMONITOR,
    _: windows_sys::Win32::Graphics::Gdi::HDC,
    _: *mut windows_sys::Win32::Foundation::RECT,
    lparam: windows_sys::Win32::Foundation::LPARAM,
) -> windows_sys::Win32::Foundation::BOOL {
    let monitors = &mut *(lparam as *mut Vec<(i32, i32, i32, i32, bool, String)>);
    let mut mi: windows_sys::Win32::Graphics::Gdi::MONITORINFOEXW = std::mem::zeroed();
    mi.monitorInfo.cbSize = std::mem::size_of::<windows_sys::Win32::Graphics::Gdi::MONITORINFOEXW>() as u32;
    if windows_sys::Win32::Graphics::Gdi::GetMonitorInfoW(h_monitor, &mut mi as *mut _ as *mut _) != 0 {
        let is_primary = (mi.monitorInfo.dwFlags & 1) != 0;
        let name_len = mi.szDevice.iter().position(|&c| c == 0).unwrap_or(mi.szDevice.len());
        let dev_name = String::from_utf16_lossy(&mi.szDevice[..name_len]);
        monitors.push((
            mi.monitorInfo.rcMonitor.left,
            mi.monitorInfo.rcMonitor.top,
            mi.monitorInfo.rcMonitor.right - mi.monitorInfo.rcMonitor.left,
            mi.monitorInfo.rcMonitor.bottom - mi.monitorInfo.rcMonitor.top,
            is_primary,
            dev_name,
        ));
    }
    1
}

#[cfg(windows)]
fn get_monitor_rect_by_id(target_id: &str) -> Option<(f64, f64, f64, f64)> {
    use windows_sys::Win32::Graphics::Gdi::EnumDisplayMonitors;
    unsafe {
        let mut monitors: Vec<(i32, i32, i32, i32, bool, String)> = Vec::new();
        EnumDisplayMonitors(
            std::ptr::null_mut(),
            std::ptr::null(),
            Some(enum_monitors_callback),
            &mut monitors as *mut _ as isize,
        );

        let target_lower = target_id.to_lowercase();
        if target_lower == "screen1" || target_lower.contains("display1") {
            if let Some(m) = monitors.get(0) {
                return Some((m.0 as f64, m.1 as f64, m.2 as f64, m.3 as f64));
            }
        } else if target_lower == "screen2" || target_lower.contains("display2") {
            if let Some(m) = monitors.get(1) {
                return Some((m.0 as f64, m.1 as f64, m.2 as f64, m.3 as f64));
            }
        } else {
            for m in &monitors {
                if m.5.to_lowercase().contains(&target_lower) {
                    return Some((m.0 as f64, m.1 as f64, m.2 as f64, m.3 as f64));
                }
            }
        }
    }
    None
}

#[derive(Clone, serde::Serialize)]
struct CursorCoordinates {
    x: f64,
    y: f64,
}

#[cfg(windows)]
fn get_system_cursor_position() -> CursorCoordinates {
    use windows_sys::Win32::Foundation::POINT;
    use windows_sys::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST};
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetCursorPos, GetSystemMetrics, SM_CXSCREEN, SM_CYSCREEN};
    unsafe {
        let mut pt = POINT { x: 0, y: 0 };
        GetCursorPos(&mut pt);

        // Check if a specific monitor target is active
        let target = ACTIVE_MONITOR_TARGET.lock().ok().and_then(|guard| guard.clone());
        if let Some(target_id) = target {
            if let Some(rect) = get_monitor_rect_by_id(&target_id) {
                let (left, top, mon_w, mon_h) = rect;
                if mon_w > 0.0 && mon_h > 0.0 {
                    let in_bounds = (pt.x as f64) >= left && (pt.x as f64) <= (left + mon_w) &&
                                    (pt.y as f64) >= top && (pt.y as f64) <= (top + mon_h);
                    if in_bounds {
                        return CursorCoordinates {
                            x: ((pt.x as f64 - left) / mon_w).clamp(0.0, 1.0),
                            y: ((pt.y as f64 - top) / mon_h).clamp(0.0, 1.0),
                        };
                    } else {
                        // Mouse is on another monitor: place cursor off-screen so it does not ghost
                        return CursorCoordinates { x: -1.0, y: -1.0 };
                    }
                }
            }
        }

        // Default: locate the exact monitor containing the cursor
        let h_monitor = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
        let mut mi: MONITORINFO = std::mem::zeroed();
        mi.cbSize = std::mem::size_of::<MONITORINFO>() as u32;

        if !h_monitor.is_null() && GetMonitorInfoW(h_monitor, &mut mi) != 0 {
            let mon_w = (mi.rcMonitor.right - mi.rcMonitor.left) as f64;
            let mon_h = (mi.rcMonitor.bottom - mi.rcMonitor.top) as f64;
            if mon_w > 0.0 && mon_h > 0.0 {
                return CursorCoordinates {
                    x: ((pt.x - mi.rcMonitor.left) as f64 / mon_w).clamp(0.0, 1.0),
                    y: ((pt.y - mi.rcMonitor.top) as f64 / mon_h).clamp(0.0, 1.0),
                };
            }
        }

        // Fallback to primary screen metrics
        let screen_w = GetSystemMetrics(SM_CXSCREEN) as f64;
        let screen_h = GetSystemMetrics(SM_CYSCREEN) as f64;
        if screen_w > 0.0 && screen_h > 0.0 {
            CursorCoordinates {
                x: (pt.x as f64 / screen_w).clamp(0.0, 1.0),
                y: (pt.y as f64 / screen_h).clamp(0.0, 1.0),
            }
        } else {
            CursorCoordinates { x: 0.5, y: 0.5 }
        }
    }
}

#[derive(Clone, serde::Serialize)]
struct ClickEvent {
    x: f64,
    y: f64,
    button: String,
}

#[derive(Clone, serde::Serialize)]
struct KeystrokeEvent {
    combo: String,
    key: String,
    modifiers: Vec<String>,
}

fn is_openpeek_internal_shortcut(combo: &str) -> bool {
    matches!(
        combo,
        "Alt + R" | "F6" |
        "Alt + P" | "F7" |
        "Alt + Z" | "F9" |
        "Alt + D" | "F8" |
        "Alt + C" | "F10"
    )
}

#[cfg(not(windows))]
fn get_system_cursor_position() -> CursorCoordinates {
    CursorCoordinates { x: 0.5, y: 0.5 }
}

fn position_overlay_to_active_monitor(overlay: &tauri::WebviewWindow) {
    #[cfg(windows)]
    {
        use windows_sys::Win32::Foundation::POINT;
        use windows_sys::Win32::Graphics::Gdi::{GetMonitorInfoW, MonitorFromPoint, MONITORINFO, MONITOR_DEFAULTTONEAREST};
        unsafe {
            let target = ACTIVE_MONITOR_TARGET.lock().ok().and_then(|guard| guard.clone());
            if let Some(target_id) = target {
                if let Some((left, top, width, height)) = get_monitor_rect_by_id(&target_id) {
                    let _ = overlay.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                        x: left as i32,
                        y: top as i32,
                    }));
                    let _ = overlay.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                        width: width as u32,
                        height: height as u32,
                    }));
                    return;
                }
            }

            let mut pt = POINT { x: 0, y: 0 };
            windows_sys::Win32::UI::WindowsAndMessaging::GetCursorPos(&mut pt);
            let h_mon = MonitorFromPoint(pt, MONITOR_DEFAULTTONEAREST);
            let mut mi: MONITORINFO = std::mem::zeroed();
            mi.cbSize = std::mem::size_of::<MONITORINFO>() as u32;
            if !h_mon.is_null() && GetMonitorInfoW(h_mon, &mut mi) != 0 {
                let _ = overlay.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: mi.rcMonitor.left,
                    y: mi.rcMonitor.top,
                }));
                let _ = overlay.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: (mi.rcMonitor.right - mi.rcMonitor.left) as u32,
                    height: (mi.rcMonitor.bottom - mi.rcMonitor.top) as u32,
                }));
            }
        }
    }
}

#[tauri::command]
fn get_system_monitors(app: tauri::AppHandle) -> Vec<SystemMonitor> {
    let mut result = Vec::new();
    let primary_name = app.primary_monitor().ok().flatten().and_then(|m| m.name().map(|s| s.to_string()));
    
    if let Ok(monitors) = app.available_monitors() {
        for (index, m) in monitors.into_iter().enumerate() {
            let name_str = m.name().map(|s| s.to_string()).unwrap_or_else(|| format!("Display {}", index + 1));
            let is_prim = primary_name.as_ref().map(|p| p == &name_str).unwrap_or(index == 0);
            result.push(SystemMonitor {
                id: format!("screen{}", index + 1),
                name: name_str,
                is_primary: is_prim,
                width: m.size().width,
                height: m.size().height,
                x: m.position().x,
                y: m.position().y,
                scale_factor: m.scale_factor(),
            });
        }
    }
    result
}

#[tauri::command]
fn get_screen_preference() -> String {
    load_screen_preference()
}

#[tauri::command]
fn save_screen_preference(preference: String) {
    save_screen_preference_to_disk(&preference);
}

#[tauri::command]
fn set_active_capture_monitor(monitor_id: String) {
    let mut lock = ACTIVE_MONITOR_TARGET.lock().unwrap();
    if monitor_id == "prompt" || monitor_id.is_empty() {
        *lock = None;
    } else {
        *lock = Some(monitor_id);
    }
}

#[tauri::command]
fn show_overlay(app: tauri::AppHandle) {
    if let Some(overlay) = app.get_webview_window("overlay") {
        position_overlay_to_active_monitor(&overlay);
        let _ = overlay.set_ignore_cursor_events(false);
        let _ = overlay.show();
        let _ = overlay.set_focus();
    }
}

#[tauri::command]
fn show_overlay_hud(app: tauri::AppHandle) {
    if let Some(overlay) = app.get_webview_window("overlay") {
        position_overlay_to_active_monitor(&overlay);
        let _ = overlay.set_ignore_cursor_events(true);
        let _ = overlay.show();
    }
}

#[tauri::command]
fn hide_overlay(app: tauri::AppHandle) {
    if let Some(overlay) = app.get_webview_window("overlay") {
        let _ = overlay.hide();
    }
}

#[tauri::command]
fn toggle_overlay(app: tauri::AppHandle) {
    if let Some(overlay) = app.get_webview_window("overlay") {
        if overlay.is_visible().unwrap_or(false) {
            let _ = overlay.hide();
        } else {
            position_overlay_to_active_monitor(&overlay);
            let _ = overlay.show();
            let _ = overlay.set_focus();
        }
    }
}

fn find_ffmpeg_executable() -> Option<std::path::PathBuf> {
    // 1. Check if ffmpeg is in PATH
    let mut check_cmd = std::process::Command::new("ffmpeg");
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        check_cmd.creation_flags(CREATE_NO_WINDOW);
    }
    check_cmd.arg("-version");

    if let Ok(output) = check_cmd.output() {
        if output.status.success() {
            return Some(std::path::PathBuf::from("ffmpeg"));
        }
    }

    // 2. On Windows, search WinGet packages directory
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let winget_dir = std::path::PathBuf::from(local_app_data).join("Microsoft").join("WinGet").join("Packages");
        if winget_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(winget_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_dir() {
                        let candidate1 = path.join("ffmpeg.exe");
                        if candidate1.exists() {
                            return Some(candidate1);
                        }
                        if let Ok(sub_entries) = std::fs::read_dir(&path) {
                            for sub_entry in sub_entries.flatten() {
                                let sub_path = sub_entry.path();
                                let candidate2 = sub_path.join("bin").join("ffmpeg.exe");
                                if candidate2.exists() {
                                    return Some(candidate2);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // 3. Common installation paths
    for prefix in &["C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe", "C:\\ffmpeg\\bin\\ffmpeg.exe"] {
        let p = std::path::PathBuf::from(prefix);
        if p.exists() {
            return Some(p);
        }
    }

    None
}

#[tauri::command]
fn is_ffmpeg_available() -> bool {
    find_ffmpeg_executable().is_some()
}

#[tauri::command]
async fn convert_webm_to_mp4(webm_bytes: Vec<u8>) -> Result<Vec<u8>, String> {
    let ffmpeg_cmd = find_ffmpeg_executable().ok_or_else(|| {
        "FFmpeg n'a pas été détecté sur votre ordinateur.".to_string()
    })?;

    let temp_dir = std::env::temp_dir();
    let unique_id = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(12345);

    let input_path = temp_dir.join(format!("openpeek_render_{}.webm", unique_id));
    let output_path = temp_dir.join(format!("openpeek_render_{}.mp4", unique_id));

    std::fs::write(&input_path, &webm_bytes)
        .map_err(|e| format!("Impossible d'écrire le fichier WebM temporaire: {}", e))?;

    let mut cmd = std::process::Command::new(ffmpeg_cmd);
    cmd.args(&[
        "-y",
        "-i",
        input_path.to_str().unwrap(),
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-crf",
        "22",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
        output_path.to_str().unwrap(),
    ]);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd.output().map_err(|e| {
        let _ = std::fs::remove_file(&input_path);
        format!("Erreur lors de l'exécution de FFmpeg: {}", e)
    })?;

    let _ = std::fs::remove_file(&input_path);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let _ = std::fs::remove_file(&output_path);
        return Err(format!("Échec de l'encodage FFmpeg: {}", stderr));
    }

    let mp4_bytes = std::fs::read(&output_path).map_err(|e| {
        let _ = std::fs::remove_file(&output_path);
        format!("Impossible de lire le fichier MP4 résultant: {}", e)
    })?;

    let _ = std::fs::remove_file(&output_path);

    Ok(mp4_bytes)
}

fn main() {
    let screen_pref = load_screen_preference();
    let mut args = String::from(
        "--autoplay-policy=no-user-gesture-required --enable-usermedia-screen-capturing --disable-features=CalculateWindowOcclusion --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding"
    );

    match screen_pref.as_str() {
        "screen2" => {
            args.push_str(" --auto-select-desktop-capture-source=\"2\"");
        }
        "screen1" => {
            args.push_str(" --auto-select-desktop-capture-source=\"1\"");
        }
        _ => {
            // "prompt": no auto-selection flag passed, native picker opens cleanly with all monitors!
        }
    }

    std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", args);

    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        let s = shortcut.to_string();
                        if s.contains("F9") || (s.contains("Alt") && (s.contains("KeyZ") || s.contains('Z') || s.contains('z'))) {
                            let pos = get_system_cursor_position();
                            let _ = app.emit("toggle-zoom", pos);
                        } else if s.contains("F6") || (s.contains("Alt") && (s.contains("KeyR") || s.contains('R') || s.contains('r'))) {
                            let _ = app.emit("toggle-record", ());
                        } else if s.contains("F7") || (s.contains("Alt") && (s.contains("KeyP") || s.contains('P') || s.contains('p'))) {
                            let _ = app.emit("toggle-pause", ());
                        } else if s.contains("Alt") && (s.contains("KeyD") || s.contains('D') || s.contains('d')) {
                            let _ = app.emit("toggle-draw", ());
                            if let Some(overlay) = app.get_webview_window("overlay") {
                                if overlay.is_visible().unwrap_or(false) {
                                    let _ = overlay.hide();
                                } else {
                                    position_overlay_to_active_monitor(&overlay);
                                    let _ = overlay.show();
                                    let _ = overlay.set_focus();
                                }
                            }
                        } else if s.contains("Alt") && (s.contains("KeyC") || s.contains('C') || s.contains('c')) {
                            let _ = app.emit("clear-drawings", ());
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            show_overlay,
            hide_overlay,
            toggle_overlay,
            show_overlay_hud,
            get_system_monitors,
            get_screen_preference,
            save_screen_preference,
            set_active_capture_monitor,
            is_ffmpeg_available,
            convert_webm_to_mp4
        ])
        .setup(|app| {
            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.maximize();
            }

            if let Ok(alt_z) = "Alt+Z".parse::<Shortcut>() {
                let _ = app.global_shortcut().register(alt_z);
            }
            if let Ok(f9) = "F9".parse::<Shortcut>() {
                let _ = app.global_shortcut().register(f9);
            }
            if let Ok(alt_r) = "Alt+R".parse::<Shortcut>() {
                let _ = app.global_shortcut().register(alt_r);
            }
            if let Ok(f6) = "F6".parse::<Shortcut>() {
                let _ = app.global_shortcut().register(f6);
            }
            if let Ok(alt_p) = "Alt+P".parse::<Shortcut>() {
                let _ = app.global_shortcut().register(alt_p);
            }
            if let Ok(f7) = "F7".parse::<Shortcut>() {
                let _ = app.global_shortcut().register(f7);
            }
            if let Ok(alt_d) = "Alt+D".parse::<Shortcut>() {
                let _ = app.global_shortcut().register(alt_d);
            }
            if let Ok(alt_c) = "Alt+C".parse::<Shortcut>() {
                let _ = app.global_shortcut().register(alt_c);
            }

            // Spawn background thread to detect system-wide mouse clicks and global hotkeys
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut prev_left = false;
                let mut prev_right = false;
                let mut prev_zoom_key = false;
                let mut prev_record_key = false;
                let mut prev_pause_key = false;
                let mut prev_draw_key = false;
                let mut prev_clear_key = false;
                let mut prev_esc_key = false;
                let mut prev_cursor_pos = CursorCoordinates { x: -1.0, y: -1.0 };
                let mut prev_keys = [false; 256];

                loop {
                    #[cfg(windows)]
                    {
                        // 1. Continuous smooth cursor tracking (~120Hz)
                        let current_cursor = get_system_cursor_position();
                        if (current_cursor.x - prev_cursor_pos.x).abs() > 0.0003 || (current_cursor.y - prev_cursor_pos.y).abs() > 0.0003 {
                            let _ = app_handle.emit("cursor-move", current_cursor.clone());
                            prev_cursor_pos = current_cursor;
                        }
                        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
                            GetAsyncKeyState, VK_LBUTTON, VK_RBUTTON, VK_MENU, VK_CONTROL, VK_SHIFT,
                            VK_LWIN, VK_RWIN, VK_RETURN, VK_ESCAPE, VK_TAB, VK_SPACE, VK_BACK,
                            VK_DELETE, VK_LEFT, VK_UP, VK_RIGHT, VK_DOWN,
                            VK_F1, VK_F2, VK_F3, VK_F4, VK_F5, VK_F6, VK_F7, VK_F8, VK_F9, VK_F10, VK_F11, VK_F12
                        };

                        let alt_down = unsafe { (GetAsyncKeyState(VK_MENU as i32) as u16 & 0x8000) != 0 };
                        let z_down = unsafe { (GetAsyncKeyState(b'Z' as i32) as u16 & 0x8000) != 0 };
                        let r_down = unsafe { (GetAsyncKeyState(b'R' as i32) as u16 & 0x8000) != 0 };
                        let p_down = unsafe { (GetAsyncKeyState(b'P' as i32) as u16 & 0x8000) != 0 };
                        let d_down = unsafe { (GetAsyncKeyState(b'D' as i32) as u16 & 0x8000) != 0 };
                        let c_down = unsafe { (GetAsyncKeyState(b'C' as i32) as u16 & 0x8000) != 0 };
                        let f6_down = unsafe { (GetAsyncKeyState(VK_F6 as i32) as u16 & 0x8000) != 0 };
                        let f7_down = unsafe { (GetAsyncKeyState(VK_F7 as i32) as u16 & 0x8000) != 0 };
                        let f8_down = unsafe { (GetAsyncKeyState(VK_F8 as i32) as u16 & 0x8000) != 0 };
                        let f9_down = unsafe { (GetAsyncKeyState(VK_F9 as i32) as u16 & 0x8000) != 0 };
                        let f10_down = unsafe { (GetAsyncKeyState(VK_F10 as i32) as u16 & 0x8000) != 0 };

                        // Record Start/Stop hotkey (Alt+R or F6)
                        let record_pressed = (alt_down && r_down) || f6_down;
                        if record_pressed && !prev_record_key {
                            let _ = app_handle.emit("toggle-record", ());
                        }
                        prev_record_key = record_pressed;

                        // Pause/Resume hotkey (Alt+P or F7)
                        let pause_pressed = (alt_down && p_down) || f7_down;
                        if pause_pressed && !prev_pause_key {
                            let _ = app_handle.emit("toggle-pause", ());
                        }
                        prev_pause_key = pause_pressed;

                        // Zoom hotkey (Alt+Z or F9)
                        let zoom_pressed = (alt_down && z_down) || f9_down;
                        if zoom_pressed && !prev_zoom_key {
                            let pos = get_system_cursor_position();
                            let _ = app_handle.emit("toggle-zoom", pos);
                        }
                        prev_zoom_key = zoom_pressed;

                        // Draw hotkey (Alt+D or F8)
                        let draw_pressed = (alt_down && d_down) || f8_down;
                        if draw_pressed && !prev_draw_key {
                            let _ = app_handle.emit("toggle-draw", ());
                            if let Some(overlay) = app_handle.get_webview_window("overlay") {
                                if overlay.is_visible().unwrap_or(false) {
                                    let _ = overlay.hide();
                                    let _ = app_handle.emit("set-drawing-mode", serde_json::json!({ "active": false }));
                                    let _ = app_handle.emit("unfreeze-snapshot", ());
                                } else {
                                    position_overlay_to_active_monitor(&overlay);
                                    let _ = overlay.show();
                                    let _ = overlay.set_focus();
                                }
                            }
                        }
                        prev_draw_key = draw_pressed;

                        // Escape hotkey: always exit drawing mode and unfreeze screen
                        let esc_down = unsafe { (GetAsyncKeyState(VK_ESCAPE as i32) as u16 & 0x8000) != 0 };
                        if esc_down && !prev_esc_key {
                            if let Some(overlay) = app_handle.get_webview_window("overlay") {
                                if overlay.is_visible().unwrap_or(false) {
                                    let _ = overlay.hide();
                                    let _ = app_handle.emit("exit-draw", ());
                                    let _ = app_handle.emit("set-drawing-mode", serde_json::json!({ "active": false }));
                                    let _ = app_handle.emit("unfreeze-snapshot", ());
                                }
                            }
                        }
                        prev_esc_key = esc_down;

                        // Clear drawings hotkey (Alt+C or F10)
                        let clear_pressed = (alt_down && c_down) || f10_down;
                        if clear_pressed && !prev_clear_key {
                            let _ = app_handle.emit("clear-drawings", ());
                        }
                        prev_clear_key = clear_pressed;

                        let left_down = unsafe { (GetAsyncKeyState(VK_LBUTTON as i32) as u16 & 0x8000) != 0 };
                        let right_down = unsafe { (GetAsyncKeyState(VK_RBUTTON as i32) as u16 & 0x8000) != 0 };

                        if left_down {
                            if !prev_left {
                                let pos = get_system_cursor_position();
                                let _ = app_handle.emit("mouse-click", ClickEvent {
                                    x: pos.x,
                                    y: pos.y,
                                    button: "left".into(),
                                });
                            }
                        }

                        if right_down && !prev_right {
                            let pos = get_system_cursor_position();
                            let _ = app_handle.emit("mouse-click", ClickEvent {
                                x: pos.x,
                                y: pos.y,
                                button: "right".into(),
                            });
                        }

                        prev_left = left_down;
                        prev_right = right_down;

                        // 2. Global Keystroke Visualizer Scanner
                        let ctrl_down = unsafe { (GetAsyncKeyState(VK_CONTROL as i32) as u16 & 0x8000) != 0 };
                        let shift_down = unsafe { (GetAsyncKeyState(VK_SHIFT as i32) as u16 & 0x8000) != 0 };
                        let win_down = unsafe {
                            ((GetAsyncKeyState(VK_LWIN as i32) as u16 & 0x8000) != 0) ||
                            ((GetAsyncKeyState(VK_RWIN as i32) as u16 & 0x8000) != 0)
                        };

                        let has_modifier = ctrl_down || alt_down || win_down;

                        // Letters A-Z
                        for vk in 0x41u32..=0x5Au32 {
                            let is_down = unsafe { (GetAsyncKeyState(vk as i32) as u16 & 0x8000) != 0 };
                            let prev = prev_keys[vk as usize];
                            if is_down && !prev && (has_modifier || shift_down) {
                                let key_char = (vk as u8 as char).to_string();
                                let mut mods = Vec::new();
                                if ctrl_down { mods.push("Ctrl".to_string()); }
                                if alt_down { mods.push("Alt".to_string()); }
                                if shift_down { mods.push("Shift".to_string()); }
                                if win_down { mods.push("Win".to_string()); }
                                let mut combo_parts = mods.clone();
                                combo_parts.push(key_char.clone());
                                let combo = combo_parts.join(" + ");
                                if !is_openpeek_internal_shortcut(&combo) {
                                    let _ = app_handle.emit("keystroke", KeystrokeEvent {
                                        combo,
                                        key: key_char,
                                        modifiers: mods,
                                    });
                                }
                            }
                            prev_keys[vk as usize] = is_down;
                        }

                        // Numbers 0-9
                        for vk in 0x30u32..=0x39u32 {
                            let is_down = unsafe { (GetAsyncKeyState(vk as i32) as u16 & 0x8000) != 0 };
                            let prev = prev_keys[vk as usize];
                            if is_down && !prev && (has_modifier || shift_down) {
                                let key_char = (vk as u8 as char).to_string();
                                let mut mods = Vec::new();
                                if ctrl_down { mods.push("Ctrl".to_string()); }
                                if alt_down { mods.push("Alt".to_string()); }
                                if shift_down { mods.push("Shift".to_string()); }
                                if win_down { mods.push("Win".to_string()); }
                                let mut combo_parts = mods.clone();
                                combo_parts.push(key_char.clone());
                                let combo = combo_parts.join(" + ");
                                if !is_openpeek_internal_shortcut(&combo) {
                                    let _ = app_handle.emit("keystroke", KeystrokeEvent {
                                        combo,
                                        key: key_char,
                                        modifiers: mods,
                                    });
                                }
                            }
                            prev_keys[vk as usize] = is_down;
                        }

                        // Action / Navigation Keys
                        const ACTION_KEYS: &[(u16, &str)] = &[
                            (VK_RETURN, "Entrée"),
                            (VK_ESCAPE, "Échap"),
                            (VK_TAB, "Tab"),
                            (VK_SPACE, "Espace"),
                            (VK_BACK, "Retour"),
                            (VK_DELETE, "Suppr"),
                            (VK_LEFT, "←"),
                            (VK_UP, "↑"),
                            (VK_RIGHT, "→"),
                            (VK_DOWN, "↓"),
                            (VK_F1, "F1"),
                            (VK_F2, "F2"),
                            (VK_F3, "F3"),
                            (VK_F4, "F4"),
                            (VK_F5, "F5"),
                            (VK_F6, "F6"),
                            (VK_F7, "F7"),
                            (VK_F8, "F8"),
                            (VK_F9, "F9"),
                            (VK_F10, "F10"),
                            (VK_F11, "F11"),
                            (VK_F12, "F12"),
                        ];

                        for &(vk, label) in ACTION_KEYS {
                            let is_down = unsafe { (GetAsyncKeyState(vk as i32) as u16 & 0x8000) != 0 };
                            let prev = prev_keys[vk as usize];
                            if is_down && !prev {
                                let mut mods = Vec::new();
                                if ctrl_down { mods.push("Ctrl".to_string()); }
                                if alt_down { mods.push("Alt".to_string()); }
                                if shift_down { mods.push("Shift".to_string()); }
                                if win_down { mods.push("Win".to_string()); }
                                let mut combo_parts = mods.clone();
                                combo_parts.push(label.to_string());
                                let combo = combo_parts.join(" + ");
                                if !is_openpeek_internal_shortcut(&combo) {
                                    let _ = app_handle.emit("keystroke", KeystrokeEvent {
                                        combo,
                                        key: label.to_string(),
                                        modifiers: mods,
                                    });
                                }
                            }
                            prev_keys[vk as usize] = is_down;
                        }
                    }
                    std::thread::sleep(std::time::Duration::from_millis(8));
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                match event {
                    tauri::WindowEvent::CloseRequested { .. } | tauri::WindowEvent::Destroyed => {
                        window.app_handle().exit(0);
                        std::process::exit(0);
                    }
                    _ => {}
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
