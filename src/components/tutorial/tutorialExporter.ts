export interface TutorialStep {
  id: string;
  time: number;
  formattedTime: string;
  title: string;
  description: string;
  tip?: string;
  imageUrl: string;
}

export interface TutorialMetadata {
  title: string;
  author: string;
  estimatedTime: string;
  difficulty: 'Débutant' | 'Intermédiaire' | 'Avancé';
  intro: string;
}

export function generateMarkdown(meta: TutorialMetadata, steps: TutorialStep[]): string {
  let md = `# 📖 ${meta.title}\n\n`;
  md += `> **Auteur :** ${meta.author} | **Durée estimée :** ${meta.estimatedTime} | **Difficulté :** ${meta.difficulty}\n\n`;
  if (meta.intro) {
    md += `${meta.intro}\n\n`;
  }
  md += `## 📋 Sommaire des étapes\n\n`;
  steps.forEach((step, idx) => {
    md += `${idx + 1}. [${step.title} (${step.formattedTime})](#etape-${idx + 1})\n`;
  });
  md += `\n---\n\n`;

  steps.forEach((step, idx) => {
    md += `### Étape ${idx + 1} : ${step.title}\n`;
    md += `*⏱️ Moment dans la vidéo : ${step.formattedTime}*\n\n`;
    md += `![${step.title}](${step.imageUrl})\n\n`;
    md += `${step.description}\n\n`;
    if (step.tip && step.tip.trim()) {
      md += `> [!TIP]\n> **Astuce :** ${step.tip}\n\n`;
    }
    md += `---\n\n`;
  });

  md += `*Guide généré automatiquement avec [OpenPeek](https://github.com/gotenash/OpenPeek) - Enregistreur d'écran open-source.*`;
  return md;
}

export function generateHTML(meta: TutorialMetadata, steps: TutorialStep[], forPrint = false): string {
  const stepsHtml = steps.map((step, idx) => `
    <section class="step-card" id="step-${idx + 1}">
      <div class="step-header">
        <span class="step-badge">Étape ${idx + 1}</span>
        <h2 class="step-title">${step.title}</h2>
        <span class="step-time">⏱️ ${step.formattedTime}</span>
      </div>
      <div class="step-media">
        <img src="${step.imageUrl}" alt="${step.title}" loading="lazy" />
      </div>
      <div class="step-content">
        <p class="step-desc">${step.description.replace(/\n/g, '<br/>')}</p>
        ${step.tip ? `
          <div class="step-tip">
            <span class="tip-icon">💡</span>
            <div><strong>Astuce :</strong> ${step.tip}</div>
          </div>
        ` : ''}
      </div>
    </section>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${meta.title} - Guide Pas-à-Pas</title>
<style>
  :root {
    --primary: #8b5cf6;
    --primary-dark: #6d28d9;
    --bg: #0b0f19;
    --card-bg: #131b2e;
    --text: #f8fafc;
    --text-muted: #94a3b8;
    --border: rgba(255, 255, 255, 0.1);
    --accent: #38bdf8;
  }
  @media (prefers-color-scheme: light) {
    :root {
      --primary: #7c3aed;
      --bg: #f8fafc;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
    }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background-color: var(--bg);
    color: var(--text);
    line-height: 1.6;
    padding: 30px 20px 80px;
  }
  .container { max-width: 860px; margin: 0 auto; }
  header.guide-header { margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid var(--border); }
  h1.guide-title {
    font-size: 2.2rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 12px;
    background: linear-gradient(135deg, #a78bfa 0%, #38bdf8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .meta-bar { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; font-size: 0.85rem; color: var(--text-muted); }
  .meta-tag {
    background: rgba(139, 92, 246, 0.12);
    border: 1px solid rgba(139, 92, 246, 0.3);
    padding: 4px 10px;
    border-radius: 20px;
    font-weight: 600;
    color: #c4b5fd;
  }
  .intro-box {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-left: 4px solid var(--primary);
    padding: 16px 20px;
    border-radius: 8px;
    margin-bottom: 30px;
    font-size: 1rem;
  }
  .step-card {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 32px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    page-break-inside: avoid;
  }
  .step-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .step-badge {
    background: linear-gradient(135deg, #8b5cf6, #3b82f6);
    color: #ffffff;
    padding: 4px 12px;
    border-radius: 16px;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .step-title { font-size: 1.3rem; font-weight: 700; flex-grow: 1; }
  .step-time { font-size: 0.85rem; color: var(--text-muted); font-family: monospace; }
  .step-media img {
    width: 100%;
    height: auto;
    border-radius: 8px;
    border: 1px solid var(--border);
    display: block;
    margin-bottom: 16px;
  }
  .step-desc { font-size: 1.05rem; margin-bottom: 12px; }
  .step-tip {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    background: rgba(56, 189, 248, 0.08);
    border: 1px solid rgba(56, 189, 248, 0.25);
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 0.95rem;
    color: #7dd3fc;
  }
  .footer { text-align: center; margin-top: 60px; font-size: 0.85rem; color: var(--text-muted); }
  .print-btn {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #8b5cf6;
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 30px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(139, 92, 246, 0.5);
    z-index: 100;
  }
  @media print {
    body { background: #ffffff !important; color: #000000 !important; padding: 0 !important; }
    .no-print, .print-btn { display: none !important; }
    .container { max-width: 100% !important; }
    h1.guide-title { background: none !important; -webkit-text-fill-color: initial !important; color: #111827 !important; }
    .step-card { background: #ffffff !important; border: 1px solid #cbd5e1 !important; box-shadow: none !important; page-break-inside: avoid; margin-bottom: 24px; }
    .step-badge { background: #6d28d9 !important; color: #ffffff !important; }
    .step-tip { background: #f0f9ff !important; color: #0369a1 !important; border-color: #bae6fd !important; }
    .step-media img { border-color: #cbd5e1 !important; }
  }
</style>
</head>
<body>
${!forPrint ? '<button class="print-btn no-print" onclick="window.print()">🖨️ Imprimer ce Guide</button>' : ''}
<div class="container">
  <header class="guide-header">
    <h1 class="guide-title">${meta.title}</h1>
    <div class="meta-bar">
      <span class="meta-tag">⏱️ ${meta.estimatedTime}</span>
      <span class="meta-tag">🎯 ${meta.difficulty}</span>
      <span>👤 Par <strong>${meta.author}</strong></span>
      <span>📅 ${new Date().toLocaleDateString('fr-FR')}</span>
    </div>
    ${meta.intro ? `<div class="intro-box">${meta.intro.replace(/\n/g, '<br/>')}</div>` : ''}
  </header>

  <main>
    ${stepsHtml}
  </main>

  <footer class="footer">
    Généré avec <strong>OpenPeek</strong> — Enregistreur d'écran et Studio de Tutoriels.
  </footer>
</div>
</body>
</html>`;
}
