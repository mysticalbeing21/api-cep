const $ = id => document.getElementById(id);
const brl = n => n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

$("cep").addEventListener("input", e => {
  let v = e.target.value.replace(/\D/g,"").slice(0,8);
  e.target.value = v.length > 5 ? v.slice(0,5)+"-"+v.slice(5) : v;
});
$("cep").addEventListener("keydown", e => { if(e.key==="Enter") calcular(); });
$("calc").addEventListener("click", calcular);

// Busca JSON e informa qual serviço falhou
async function getJSON(nome, url){
  try{
    const r = await fetch(url);
    if(!r.ok) throw new Error("HTTP "+r.status);
    return await r.json();
  }catch(e){
    throw new Error("Falha ao acessar "+nome+" ("+e.message+"). Abra o arquivo direto no navegador (Chrome/Edge), com internet, e desative bloqueadores de anúncio.");
  }
}

// Geocodificação com Nominatim (OpenStreetMap)
async function geocode(q){
  const d = await getJSON("o Nominatim (mapa)","https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q="+encodeURIComponent(q));
  return d.length ? {lat:+d[0].lat, lon:+d[0].lon} : null;
}

async function calcular(){
  const erro = $("erro"), btn = $("calc");
  erro.textContent = ""; $("res").style.display = "none";
  const cep = $("cep").value.replace(/\D/g,"");
  if(cep.length !== 8){ erro.textContent = "Digite um CEP com 8 números."; return; }
  btn.disabled = true; btn.textContent = "Calculando...";
  try{
    // 1) ViaCEP: valida o CEP e retorna o endereço
    const v = await getJSON("o ViaCEP",`https://viacep.com.br/ws/${cep}/json/`);
    if(v.erro) throw new Error("CEP não encontrado. Confira os números e tente de novo.");

    // 2) Coordenadas de destino e origem
    const endTxt = `${v.logradouro||""}, ${v.bairro||""}, ${v.localidade} - ${v.uf}`.replace(/^, /,"");
    const dest = await geocode(`${v.logradouro}, ${v.localidade}, ${v.uf}`) || await geocode(`${v.localidade}, ${v.uf}`);
    const orig = await geocode($("origem").value);
    if(!dest) throw new Error("Não foi possível localizar esse endereço no mapa.");
    if(!orig) throw new Error("Não foi possível localizar a origem. Ajuste o endereço da Uninassau.");

    // 3) OSRM: distância e tempo por rota de carro/moto
    const url = `https://router.project-osrm.org/route/v1/driving/${orig.lon},${orig.lat};${dest.lon},${dest.lat}?overview=false`;
    const rt = await getJSON("o OSRM (rota)",url);
    if(rt.code !== "Ok") throw new Error("Não foi possível traçar a rota até esse local.");
    const km = rt.routes[0].distance/1000, mins = rt.routes[0].duration/60;

    // 4) Preço estimado do Uber Moto
    const total = +$("base").value + km*$("km").value + mins*$("min").value;

    $("total").textContent = brl(total);
    $("end").textContent = endTxt;
    $("dist").textContent = km.toFixed(1).replace(".",",")+" km";
    $("tempo").textContent = Math.round(mins)+" min";
    $("res").style.display = "block";
  }catch(e){
    erro.textContent = e.message || "Falha na consulta. Verifique sua conexão.";
  }finally{
    btn.disabled = false; btn.textContent = "Calcular frete";
  }
}