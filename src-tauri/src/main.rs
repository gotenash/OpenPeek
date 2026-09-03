// Prevents additional console window on Windows, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

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

        // Locate the exact monitor containing the cursor
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

fn main() {
    // Disable WebView2 background suspension and auto-select desktop screen capture to bypass prompt
    std::env::set_var(
        "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
        "--autoplay-policy=no-user-gesture-required --enable-usermedia-screen-capturing --auto-select-desktop-capture-source=\"Écran complet\" --auto-select-desktop-capture-source=\"Entire screen\" --auto-select-desktop-capture-source=\"Screen\" --use-fake-ui-for-media-stream --disable-features=CalculateWindowOcclusion --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding"
    );

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
        .invoke_handler(tauri::generate_handler![show_overlay, hide_overlay, toggle_overlay, show_overlay_hud])
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
                            let pos = get_system_cursor_position();
                            if !prev_left {
                                let _ = app_handle.emit("mouse-click", ClickEvent {
                                    x: pos.x,
                                    y: pos.y,
                                    button: "left".into(),
                                });
                                let _ = app_handle.emit("draw-start", pos);
                            } else {
                                let _ = app_handle.emit("draw-point", pos);
                            }
                        } else if prev_left {
                            let _ = app_handle.emit("draw-end", ());
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
