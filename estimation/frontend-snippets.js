// ═══ EXTRACTED ESTIMATION FRONTEND CODE ═══
// These snippets were removed from index.html and preserved here for future development.
// They are NOT functional standalone — they reference app state, components, and utilities
// that live in the main index.html.

// ═══ CORRECTION & HISTORY COLLECTORS ═══
const getRecentCorrections=(data,limit=10)=>{
  const corr=[];
  const dates=Object.keys(data.nut||{}).sort().reverse();
  for(const d of dates){
    if(corr.length>=limit)break;
    for(const m of(data.nut[d]?.meals||[])){
      if(corr.length>=limit)break;
      if(m.source==="ai"&&m.aiOriginal){
        const changed=["cal","protein","carbs","fat","fiber"].some(k=>(m[k]||0)!==(m.aiOriginal[k]||0));
        if(changed)corr.push({description:m.description,raw:m.raw,aiEstimate:m.aiOriginal,
          userCorrection:{cal:m.cal,protein:m.protein,carbs:m.carbs,fat:m.fat,fiber:m.fiber}});
      }
    }
  }
  return corr;
};

const getRecentMeals=(data,limit=10)=>{
  const meals=[];
  const dates=Object.keys(data.nut||{}).sort().reverse();
  for(const d of dates){
    if(meals.length>=limit)break;
    for(const m of(data.nut[d]?.meals||[])){
      if(meals.length>=limit)break;
      meals.push({description:m.description,cal:m.cal,protein:m.protein,source:m.source});
    }
  }
  return meals;
};

const getFrequentMeals=(data)=>{
  const map={};
  for(const[d,n] of Object.entries(data.nut||{})){
    for(const m of(n.meals||[])){
      if(!m.description)continue;
      const k=m.description.toLowerCase().trim();
      if(!map[k])map[k]={desc:m.description,cs:[],ps:[],bs:[],fs:[],fbs:[],n:0};
      map[k].cs.push(m.cal||0);map[k].ps.push(m.protein||0);
      map[k].bs.push(m.carbs||0);map[k].fs.push(m.fat||0);map[k].fbs.push(m.fiber||0);map[k].n++;
    }
  }
  const avg=a=>Math.round(a.reduce((s,v)=>s+v,0)/a.length);
  return Object.values(map).filter(m=>m.n>=2)
    .map(m=>({description:m.desc,cal:avg(m.cs),protein:avg(m.ps),carbs:avg(m.bs),fat:avg(m.fs),fiber:avg(m.fbs),count:m.n}))
    .sort((a,b)=>b.n-a.n).slice(0,30);
};

// ═══ NUTRITION COMPONENT STATE (estimation-related) ═══
// const [mode,setMode]=useState("ai");
// const [input,setInput]=useState("");
// const [loading,setLoading]=useState(false);
// const [photo,setPhoto]=useState(null);
// const [photoPreview,setPhotoPreview]=useState(null);
// const [portionSize,setPortionSize]=useState("normal");
// const fileRef=useRef(null);
// const galRef=useRef(null);
//
// // Barcode scan state
// const [scanResult,setScanResult]=useState(null);
// const [scanLoading,setScanLoading]=useState(false);
// const [scanError,setScanError]=useState(null);
// const scannerRef=useRef(null);
// const [scanServings,setScanServings]=useState(1);
// const [scanGrams,setScanGrams]=useState(100);
// const [scanKey,setScanKey]=useState(0);
//
// // Food search state
// const [searchQuery,setSearchQuery]=useState("");
// const [searchResults,setSearchResults]=useState([]);
// const [searchLoading,setSearchLoading]=useState(false);
// const [selectedProduct,setSelectedProduct]=useState(null);
// const [searchServings,setSearchServings]=useState(1);
// const [searchGrams,setSearchGrams]=useState(100);

// ═══ PHOTO HANDLING ═══
// const handlePhoto=(e)=>{
//   const file=e.target.files?.[0];if(!file)return;
//   setPhotoPreview(URL.createObjectURL(file));
//   const reader=new FileReader();
//   reader.onload=()=>{const b64=reader.result.split(",")[1];setPhoto({data:b64,mediaType:file.type});};
//   reader.readAsDataURL(file);
// };
// const clearPhoto=()=>{setPhoto(null);setPhotoPreview(null);if(fileRef.current)fileRef.current.value="";if(galRef.current)galRef.current.value="";};

// ═══ NORMALIZE OPEN FOOD FACTS ═══
// const normalizeOFF=(p)=>{...};

// ═══ BARCODE LOOKUP ═══
// const lookupBarcode=async(barcode)=>{...};

// ═══ FOOD SEARCH (Open Food Facts + USDA) ═══
// const searchFood=async()=>{...};

// ═══ ADD LOOKUP ═══
// const addLookup=(product,mult)=>{...};

// ═══ BARCODE SCANNER LIFECYCLE (useEffect) ═══
// useEffect for Html5QrcodeScanner init/destroy on mode==="scan"

// ═══ AI ESTIMATION FUNCTION ═══
// const aiGo=async()=>{...};

// ═══ QUICK MEALS ═══
// const sq=m=>{...}; // save quick meal
// data.qm array — quick meals library
// Settings UI: Quick Meals Library section
// Supabase: quick_meals table sync

// ═══ MODE SELECTOR UI ═══
// 5 tabs: AI, Scan, Search, Manual, Quick
// Each with full UI sections for input/results/actions

// ═══ CDN DEPENDENCY ═══
// <script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
