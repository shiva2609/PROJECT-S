function escapeHtml(html){
  return html
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;');
}

function parseFrontmatter(md){
  if(md.startsWith('---')){
    const end = md.indexOf('\n---', 3);
    if(end !== -1){
      const fm = md.slice(3, end).trim();
      const body = md.slice(end + 4).trimStart();
      const meta = {};
      fm.split(/\r?\n/).forEach(line=>{
        const idx = line.indexOf(':');
        if(idx>0){
          const key = line.slice(0, idx).trim();
          const val = line.slice(idx+1).trim();
          meta[key] = val.replace(/^"|"$/g,'');
        }
      });
      return { meta, body };
    }
  }
  return { meta:{}, body: md };
}

function basicMarkdownToHtml(md){
  const { meta, body } = parseFrontmatter(md);
  const lines = body.split(/\r?\n/);
  let html = '';
  let inCode = false;
  for(const raw of lines){
    const line = raw.trimEnd();
    if(line.startsWith('```')){
      if(inCode){ html += '</pre>'; inCode=false; }
      else { html += '<pre>'; inCode=true; }
      continue;
    }
    if(inCode){ html += escapeHtml(raw) + '\n'; continue; }
    if(/^#\s+/.test(line)) html += `<h1>${line.replace(/^#\s+/,'')}</h1>`;
    else if(/^##\s+/.test(line)) html += `<h2>${line.replace(/^##\s+/,'')}</h2>`;
    else if(/^###\s+/.test(line)) html += `<h3>${line.replace(/^###\s+/,'')}</h3>`;
    else if(/^\-\s+/.test(line)) html += `<ul><li>${line.replace(/^\-\s+/,'')}</li></ul>`;
    else if(line === '') html += '<p></p>';
    else html += `<p>${line.replace(/`([^`]+)`/g,'<code>$1</code>')}</p>`;
  }
  // merge consecutive <ul>
  html = html.replace(/<\/ul>\s*<ul>/g,'');
  return html;
}

async function loadMarkdown(path){
  const res = await fetch(path);
  const text = await res.text();
  document.getElementById('markdown').innerHTML = basicMarkdownToHtml(text);
}

function setBreadcrumb(label){
  document.title = `Sanchari Docs – ${label}`;
}

function route(){
  const hash = location.hash.replace(/^#\//,'');
  let page = 'overview';
  if(hash) page = hash;
  switch(page){
    case 'overview':
      setBreadcrumb('Overview');
      loadMarkdown('/docs/overview.md');
      break;
    case 'developer-setup':
      setBreadcrumb('Developer Setup');
      loadMarkdown('/docs/developer-setup.md');
      break;
    case 'architecture':
      setBreadcrumb('Architecture');
      loadMarkdown('/docs/architecture.md');
      break;
    case 'project-docs':
      setBreadcrumb('Project Documentation');
      loadMarkdown('/docs/Project_Documentation.md');
      break;
    default:
      setBreadcrumb('Overview');
      loadMarkdown('/docs/overview.md');
  }
}

window.addEventListener('hashchange', route);
route();

// Simple search within current page
const search = document.getElementById('search');
let lastMd = '';
const origLoadMarkdown = loadMarkdown;
loadMarkdown = async function(path){
  const res = await fetch(path);
  lastMd = await res.text();
  document.getElementById('markdown').innerHTML = basicMarkdownToHtml(lastMd);
};

search.addEventListener('input', ()=>{
  const q = search.value.trim().toLowerCase();
  if(!q){
    document.getElementById('markdown').innerHTML = basicMarkdownToHtml(lastMd);
    return;
  }
  const highlighted = lastMd.replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), 'gi'), (m)=>`**${m}**`);
  document.getElementById('markdown').innerHTML = basicMarkdownToHtml(highlighted);
});


