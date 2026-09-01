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
        let _ = overlay.show();
        let _ = overlay.set_focus();
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
    // Disable WebView2 background suspension and occlusion tracking at the Chromium level
    std::env::set_var(
        "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
        "--autoplay-policy=no-user-gesture-required --disable-features=CalculateWindowOcclusion --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding"
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
        .invoke_handler(tauri::generate_handler![show_overlay, hide_overlay, toggle_overlay])
        .setup(|app| {
            if let Ok(alt_z) = "Alt+Z".parse::<Shortcut>() {
                let _ = app.global_shortcut().register(alt_z);
            }
            if let Ok(f9) = "F9".parse::<Shortcut>() {
                let _ = app.global_shortcut().register(f9);
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
                let mut prev_draw_key = false;
                let mut prev_clear_key = false;

                loop {
                    #[cfg(windows)]
                    {
                        use windows_sys::Win32::UI::Input::KeyboardAndMouse::{
                            GetAsyncKeyState, VK_LBUTTON, VK_RBUTTON, VK_MENU, VK_F8, VK_F9, VK_F10
                        };

                        let alt_down = unsafe { (GetAsyncKeyState(VK_MENU as i32) as u16 & 0x8000) != 0 };
                        let z_down = unsafe { (GetAsyncKeyState(b'Z' as i32) as u16 & 0x8000) != 0 };
                        let d_down = unsafe { (GetAsyncKeyState(b'D' as i32) as u16 & 0x8000) != 0 };
                        let c_down = unsafe { (GetAsyncKeyState(b'C' as i32) as u16 & 0x8000) != 0 };
                        let f8_down = unsafe { (GetAsyncKeyState(VK_F8 as i32) as u16 & 0x8000) != 0 };
                        let f9_down = unsafe { (GetAsyncKeyState(VK_F9 as i32) as u16 & 0x8000) != 0 };
                        let f10_down = unsafe { (GetAsyncKeyState(VK_F10 as i32) as u16 & 0x8000) != 0 };

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
                                } else {
                                    position_overlay_to_active_monitor(&overlay);
                                    let _ = overlay.show();
                                    let _ = overlay.set_focus();
                                }
                            }
                        }
                        prev_draw_key = draw_pressed;

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
                    }
                    std::thread::sleep(std::time::Duration::from_millis(8));
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
