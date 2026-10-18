use std::path::{Path, PathBuf};
use tauri::Emitter;

pub fn find_ffmpeg_executable() -> Option<PathBuf> {
    // 1. Check next to running executable (bundled with setup or in resources)
    if let Ok(current_exe) = std::env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            let candidates = [
                parent.join("ffmpeg.exe"),
                parent.join("binaries").join("ffmpeg.exe"),
                parent.join("resources").join("binaries").join("ffmpeg.exe"),
                parent.join("resources").join("ffmpeg.exe"),
                parent.join("..").join("src-tauri").join("binaries").join("ffmpeg.exe"),
                parent.join("..").join("..").join("src-tauri").join("binaries").join("ffmpeg.exe"),
            ];
            for c in &candidates {
                if c.exists() {
                    return Some(c.clone());
                }
            }
        }
    }

    // 2. Check if ffmpeg is in PATH
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
            return Some(PathBuf::from("ffmpeg"));
        }
    }

    // 3. On Windows, search WinGet packages directory
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let winget_dir = PathBuf::from(local_app_data).join("Microsoft").join("WinGet").join("Packages");
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

    // 4. Common installation paths
    for prefix in &["C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe", "C:\\ffmpeg\\bin\\ffmpeg.exe"] {
        let p = PathBuf::from(prefix);
        if p.exists() {
            return Some(p);
        }
    }

    None
}

#[tauri::command]
pub fn is_ffmpeg_available() -> bool {
    find_ffmpeg_executable().is_some()
}

#[tauri::command]
pub async fn convert_webm_to_mp4(request: tauri::ipc::Request<'_>) -> Result<tauri::ipc::Response, String> {
    let webm_bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(b) => b.clone(),
        tauri::ipc::InvokeBody::Json(val) => {
            if let Some(arr) = val.as_array() {
                arr.iter().filter_map(|v| v.as_u64().map(|n| n as u8)).collect()
            } else if let Ok(bytes) = serde_json::from_value::<Vec<u8>>(val.clone()) {
                bytes
            } else {
                return Err("Format de données invalide".to_string());
            }
        }
    };
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
        "-map",
        "0:v",
        "-map",
        "0:a?",
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

    Ok(tauri::ipc::Response::new(mp4_bytes))
}

#[tauri::command]
pub async fn remux_webm_metadata(request: tauri::ipc::Request<'_>) -> Result<tauri::ipc::Response, String> {
    let webm_bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(b) => b.clone(),
        tauri::ipc::InvokeBody::Json(val) => {
            if let Some(arr) = val.as_array() {
                arr.iter().filter_map(|v| v.as_u64().map(|n| n as u8)).collect()
            } else if let Ok(bytes) = serde_json::from_value::<Vec<u8>>(val.clone()) {
                bytes
            } else {
                return Err("Format de données invalide".to_string());
            }
        }
    };
    let ffmpeg_cmd = find_ffmpeg_executable().ok_or_else(|| {
        "FFmpeg non disponible pour le remuxing".to_string()
    })?;

    let temp_dir = std::env::temp_dir();
    let unique_id = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(54321);

    let input_path = temp_dir.join(format!("openpeek_raw_{}.webm", unique_id));
    let output_path = temp_dir.join(format!("openpeek_fixed_{}.webm", unique_id));

    std::fs::write(&input_path, &webm_bytes)
        .map_err(|e| format!("Impossible d'écrire le fichier temporaire: {}", e))?;

    let mut cmd = std::process::Command::new(ffmpeg_cmd);
    cmd.args(&[
        "-y",
        "-i",
        input_path.to_str().unwrap(),
        "-c",
        "copy",
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
        format!("Erreur lors du remuxing FFmpeg: {}", e)
    })?;

    let _ = std::fs::remove_file(&input_path);

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let _ = std::fs::remove_file(&output_path);
        return Err(format!("Échec du remuxing FFmpeg: {}", stderr));
    }

    let fixed_bytes = std::fs::read(&output_path).map_err(|e| {
        let _ = std::fs::remove_file(&output_path);
        format!("Impossible de lire le fichier WebM réparé: {}", e)
    })?;

    let _ = std::fs::remove_file(&output_path);

    Ok(tauri::ipc::Response::new(fixed_bytes))
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct TurboClipInfo {
    pub file_path: String,
    pub is_image: bool,
    pub has_audio: bool,
    pub duration: f64,
    pub start_trim: f64,
    pub end_trim: f64,
    pub transition_to_next: String,
    pub transition_duration: f64,
    pub volume: f64,
    pub playback_speed: f64,
}

#[derive(serde::Deserialize, serde::Serialize)]
pub struct TurboRenderPayload {
    pub clips: Vec<TurboClipInfo>,
    pub bg_music_path: Option<String>,
    pub bg_music_volume: Option<f64>,
}

#[tauri::command]
pub async fn save_temp_render_clip(request: tauri::ipc::Request<'_>) -> Result<String, String> {
    let filename = request
        .headers()
        .get("x-filename")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| {
            let unique = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis())
                .unwrap_or(0);
            format!("clip_{}.dat", unique)
        });

    let bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(b) => b.clone(),
        tauri::ipc::InvokeBody::Json(val) => {
            if let Some(arr) = val.as_array() {
                arr.iter().filter_map(|v| v.as_u64().map(|n| n as u8)).collect()
            } else if let Ok(bytes) = serde_json::from_value::<Vec<u8>>(val.clone()) {
                bytes
            } else {
                return Err("Format de données invalide".to_string());
            }
        }
    };
    let temp_dir = std::env::temp_dir().join("openpeek_render_tmp");
    let _ = std::fs::create_dir_all(&temp_dir);
    let target_path = temp_dir.join(&filename);
    std::fs::write(&target_path, &bytes)
        .map_err(|e| format!("Impossible d'écrire le clip temporaire {}: {}", filename, e))?;
    Ok(target_path.to_string_lossy().to_string())
}

fn find_file_by_size_recursive(dir: &Path, target_size: u64) -> Option<PathBuf> {
    if !dir.exists() {
        return None;
    }
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                if let Some(found) = find_file_by_size_recursive(&path, target_size) {
                    return Some(found);
                }
            } else if let Ok(meta) = path.metadata() {
                if meta.len() == target_size {
                    return Some(path);
                }
            }
        }
    }
    None
}

#[tauri::command]
pub fn find_clip_disk_path(size: u64) -> Option<String> {
    if size == 0 {
        return None;
    }
    let local_app_data = std::env::var("LOCALAPPDATA").ok()?;
    let base_dir = PathBuf::from(local_app_data)
        .join("com.openpeek.desktop")
        .join("EBWebView")
        .join("Default")
        .join("IndexedDB");

    find_file_by_size_recursive(&base_dir, size).map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn append_temp_render_chunk(request: tauri::ipc::Request<'_>) -> Result<String, String> {
    let filename = request
        .headers()
        .get("x-filename")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "temp_chunk.dat".to_string());

    let is_first = request
        .headers()
        .get("x-is-first")
        .and_then(|h| h.to_str().ok())
        .map(|s| s == "true")
        .unwrap_or(false);

    let bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(b) => b.clone(),
        tauri::ipc::InvokeBody::Json(val) => {
            if let Some(arr) = val.as_array() {
                arr.iter().filter_map(|v| v.as_u64().map(|n| n as u8)).collect()
            } else if let Ok(bytes) = serde_json::from_value::<Vec<u8>>(val.clone()) {
                bytes
            } else {
                return Err("Format de données invalide".to_string());
            }
        }
    };

    let temp_dir = std::env::temp_dir().join("openpeek_render_tmp");
    let _ = std::fs::create_dir_all(&temp_dir);
    let target_path = temp_dir.join(&filename);

    use std::io::Write;
    let mut file = if is_first {
        std::fs::File::create(&target_path)
    } else {
        std::fs::OpenOptions::new().create(true).append(true).open(&target_path)
    }.map_err(|e| format!("Impossible d'ouvrir le fichier temporaire {}: {}", filename, e))?;

    file.write_all(&bytes).map_err(|e| format!("Erreur d'écriture: {}", e))?;
    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn cleanup_temp_render_clips() -> Result<(), String> {
    let temp_dir = std::env::temp_dir().join("openpeek_render_tmp");
    if temp_dir.exists() {
        let _ = std::fs::remove_dir_all(&temp_dir);
    }
    Ok(())
}

#[tauri::command]
pub async fn render_project_turbo_ffmpeg(app: tauri::AppHandle, payload: TurboRenderPayload) -> Result<tauri::ipc::Response, String> {
    if payload.clips.is_empty() {
        return Err("Aucun clip fourni pour le rendu Turbo".to_string());
    }

    let ffmpeg_cmd = find_ffmpeg_executable().ok_or_else(|| {
        "FFmpeg n'a pas été détecté sur votre ordinateur.".to_string()
    })?;

    let temp_dir = std::env::temp_dir();
    let unique_id = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(12345);
    let output_path = temp_dir.join(format!("openpeek_turbo_render_{}.mp4", unique_id));

    let total_expected_duration: f64 = if payload.clips.len() == 1 {
        payload.clips[0].duration.max(0.1)
    } else {
        let mut cur_accum_dur = payload.clips[0].duration;
        for i in 1..payload.clips.len() {
            let prev_clip = &payload.clips[i - 1];
            let this_clip = &payload.clips[i];
            let trans_dur = if prev_clip.transition_to_next == "none" {
                0.02
            } else {
                prev_clip.transition_duration.max(0.1).min(cur_accum_dur * 0.45).min(this_clip.duration * 0.45)
            };
            let offset = (cur_accum_dur - trans_dur).max(0.0);
            cur_accum_dur = offset + this_clip.duration;
        }
        cur_accum_dur.max(0.1)
    };

    let mut cmd = std::process::Command::new(ffmpeg_cmd);
    cmd.arg("-y");

    // Add inputs
    for clip in &payload.clips {
        if clip.is_image {
            cmd.args(&["-loop", "1", "-t", &format!("{:.3}", clip.duration.max(0.1)), "-framerate", "60", "-i", &clip.file_path]);
        } else {
            let start = clip.start_trim.max(0.0);
            let end = if clip.end_trim > start { clip.end_trim } else { start + 0.5 };
            cmd.args(&["-ss", &format!("{:.3}", start), "-to", &format!("{:.3}", end), "-i", &clip.file_path]);
        }
    }

    // Optional Background music input
    let mut bg_input_idx = None;
    if let Some(ref bg_path) = payload.bg_music_path {
        if Path::new(bg_path).exists() {
            bg_input_idx = Some(payload.clips.len());
            cmd.args(&["-i", bg_path]);
        }
    }

    // Build filter complex
    let n = payload.clips.len();
    if n == 1 {
        let clip = &payload.clips[0];
        let speed = if clip.playback_speed > 0.05 { clip.playback_speed } else { 1.0 };
        let speed_filter = if (speed - 1.0).abs() > 0.05 {
            format!(",setpts=PTS/{:.3}", speed)
        } else {
            "".to_string()
        };
        let filter_v = format!("[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=60,format=yuv420p{}[outv]", speed_filter);

        let a_norm = if clip.has_audio && !clip.is_image {
            let vol = clip.volume.clamp(0.0, 2.0);
            let atempo = if (speed - 1.0).abs() > 0.05 {
                if speed > 2.0 {
                    format!(",atempo=2.0,atempo={:.3}", speed / 2.0)
                } else if speed < 0.5 {
                    format!(",atempo=0.5,atempo={:.3}", speed / 0.5)
                } else {
                    format!(",atempo={:.3}", speed)
                }
            } else {
                "".to_string()
            };
            format!("[0:a]volume={:.2}{},aformat=sample_rates=48000:channel_layouts=stereo[basea]", vol, atempo)
        } else {
            format!("aevalsrc=0:d={:.3}:s=48000:c=stereo[basea]", clip.duration.max(0.1))
        };

        if let Some(bg_idx) = bg_input_idx {
            let bg_vol = payload.bg_music_volume.unwrap_or(0.15).clamp(0.0, 2.0);
            let bga = format!("[{}:a]volume={:.2},aformat=sample_rates=48000:channel_layouts=stereo[bga]", bg_idx, bg_vol);
            let amix = "[basea][bga]amix=inputs=2:duration=first:dropout_transition=2[outa]";
            let filter_complex = format!("{};{};{};{}", filter_v, a_norm, bga, amix);
            cmd.args(&["-filter_complex", &filter_complex, "-map", "[outv]", "-map", "[outa]"]);
        } else {
            let filter_a = a_norm.replace("[basea]", "[outa]");
            let filter_complex = format!("{};{}", filter_v, filter_a);
            cmd.args(&["-filter_complex", &filter_complex, "-map", "[outv]", "-map", "[outa]"]);
        }
    } else {
        let mut filter_parts = Vec::new();

        // 1. Prepare normalized individual streams [v0], [a0], etc.
        for (i, clip) in payload.clips.iter().enumerate() {
            let speed = if clip.playback_speed > 0.05 { clip.playback_speed } else { 1.0 };
            let speed_filter = if (speed - 1.0).abs() > 0.05 {
                format!(",setpts=PTS/{:.3}", speed)
            } else {
                "".to_string()
            };

            let v_norm = format!(
                "[{}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=60,format=yuv420p{}[v{}]",
                i, speed_filter, i
            );
            filter_parts.push(v_norm);

            let a_norm = if clip.has_audio && !clip.is_image {
                let vol = clip.volume.clamp(0.0, 2.0);
                let atempo = if (speed - 1.0).abs() > 0.05 {
                    if speed > 2.0 {
                        format!(",atempo=2.0,atempo={:.3}", speed / 2.0)
                    } else if speed < 0.5 {
                        format!(",atempo=0.5,atempo={:.3}", speed / 0.5)
                    } else {
                        format!(",atempo={:.3}", speed)
                    }
                } else {
                    "".to_string()
                };
                format!("[{}:a]volume={:.2}{},aformat=sample_rates=48000:channel_layouts=stereo[a{}]", i, vol, atempo, i)
            } else {
                format!("aevalsrc=0:d={:.3}:s=48000:c=stereo[a{}]", clip.duration.max(0.1), i)
            };
            filter_parts.push(a_norm);
        }

        // 2. Chain with xfade & acrossfade
        let mut cur_v = "v0".to_string();
        let mut cur_a = "a0".to_string();
        let mut cur_accum_dur = payload.clips[0].duration;

        for i in 1..n {
            let prev_clip = &payload.clips[i - 1];
            let this_clip = &payload.clips[i];

            let xfade_trans = match prev_clip.transition_to_next.as_str() {
                "fade-black" => "fadeblack",
                "slide-left" => "slideleft",
                "slide-right" => "slideright",
                "wipe-left" => "wipeleft",
                "wipe-right" => "wiperight",
                "circle-open" => "circlecrop",
                "crossfade" => "fade",
                _ => "fade", // default / none uses minimal duration
            };

            let trans_dur = if prev_clip.transition_to_next == "none" {
                0.02 // 1 frame at 60fps
            } else {
                prev_clip.transition_duration.max(0.1).min(cur_accum_dur * 0.45).min(this_clip.duration * 0.45)
            };

            let offset = (cur_accum_dur - trans_dur).max(0.0);
            let next_v = format!("vx{}", i);
            let next_a = format!("ax{}", i);

            filter_parts.push(format!(
                "[{}][v{}]xfade=transition={}:duration={:.3}:offset={:.3}[{}]",
                cur_v, i, xfade_trans, trans_dur, offset, next_v
            ));
            filter_parts.push(format!(
                "[{}][a{}]acrossfade=d={:.3}[{}]",
                cur_a, i, trans_dur, next_a
            ));

            cur_accum_dur = offset + this_clip.duration;
            cur_v = next_v;
            cur_a = next_a;
        }

        let mut final_a = cur_a;
        if let Some(bg_idx) = bg_input_idx {
            let bg_vol = payload.bg_music_volume.unwrap_or(0.15).clamp(0.0, 2.0);
            let bg_label = format!("bg_norm_{}", bg_idx);
            let mix_label = "a_final_mix";
            filter_parts.push(format!("[{}:a]volume={:.2},aformat=sample_rates=48000:channel_layouts=stereo[{}]", bg_idx, bg_vol, bg_label));
            filter_parts.push(format!("[{}][{}]amix=inputs=2:duration=first:dropout_transition=2[{}]", final_a, bg_label, mix_label));
            final_a = mix_label.to_string();
        }

        let filter_complex = filter_parts.join(";");
        cmd.args(&[
            "-filter_complex", &filter_complex,
            "-map", &format!("[{}]", cur_v),
            "-map", &format!("[{}]", final_a)
        ]);
    }

    cmd.args(&[
        "-progress", "pipe:1",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-movflags", "+faststart",
        output_path.to_str().unwrap()
    ]);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| {
        let _ = std::fs::remove_file(&output_path);
        format!("Erreur lors du lancement de FFmpeg Turbo: {}", e)
    })?;

    // Drain stderr in background thread to prevent buffer deadlocks
    let stderr_thread = child.stderr.take().map(|mut err_pipe| {
        std::thread::spawn(move || {
            let mut buf = String::new();
            use std::io::Read;
            let _ = err_pipe.read_to_string(&mut buf);
            buf
        })
    });

    // Stream progress indicators from stdout directly to the frontend
    if let Some(stdout) = child.stdout.take() {
        use std::io::BufRead;
        let reader = std::io::BufReader::new(stdout);
        let mut out_time_sec = 0.0f64;
        let mut fps = 0.0f64;
        let mut speed = String::new();
        let mut last_emit = std::time::Instant::now();

        for line in reader.lines().filter_map(|l| l.ok()) {
            if let Some(val) = line.strip_prefix("out_time_us=") {
                if let Ok(us) = val.trim().parse::<u64>() {
                    out_time_sec = us as f64 / 1_000_000.0;
                }
            } else if let Some(val) = line.strip_prefix("fps=") {
                if let Ok(f) = val.trim().parse::<f64>() {
                    fps = f;
                }
            } else if let Some(val) = line.strip_prefix("speed=") {
                speed = val.trim().to_string();
            } else if line.starts_with("progress=") {
                if last_emit.elapsed().as_millis() >= 80 {
                    let percent = ((out_time_sec / total_expected_duration) * 100.0).clamp(0.0, 99.0);
                    let _ = app.emit("turbo-ffmpeg-progress", serde_json::json!({
                        "out_time_sec": out_time_sec,
                        "total_duration_sec": total_expected_duration,
                        "percent": percent,
                        "speed": speed.clone(),
                        "fps": fps
                    }));
                    last_emit = std::time::Instant::now();
                }
            }
        }
    }

    let status = child.wait().map_err(|e| {
        let _ = std::fs::remove_file(&output_path);
        format!("Erreur lors de l'attente de FFmpeg Turbo: {}", e)
    })?;

    if !status.success() {
        let stderr_msg = stderr_thread.and_then(|t| t.join().ok()).unwrap_or_default();
        let _ = std::fs::remove_file(&output_path);
        return Err(format!("Échec du rendu Turbo FFmpeg: {}", stderr_msg));
    }

    let mp4_bytes = std::fs::read(&output_path).map_err(|e| {
        let _ = std::fs::remove_file(&output_path);
        format!("Impossible de lire le fichier MP4 résultant: {}", e)
    })?;

    let _ = std::fs::remove_file(&output_path);
    let _ = cleanup_temp_render_clips();

    Ok(tauri::ipc::Response::new(mp4_bytes))
}
