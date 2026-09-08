// ═══ HEALTH HUB ENGINE ═══
// One brain, two delivery vehicles. Everything here is pure and isomorphic:
// no window, no localStorage, no fetch. The app (src/app.jsx, bundled by
// esbuild) and the Coach MCP server (api/mcp.js, Node) import this same file,
// so the numbers a coach sees are the numbers the phone shows.
// ═══ PROGRAM ═══
export const PROG = {
  // version: bump whenever PROG.days changes in code. A stored program row (coach
  // edits) is kept only while its version matches; a new version resets it.
  name:"Summer Cut v2",version:"summer-cut-v2.2026-09-08",weeks:8,deload:4,start:"2026-07-06",end:"2026-08-30",
  checkpoint:{week:4,date:"2026-08-02"},startWeight:192,targetWeight:180,
  mobility:{
    _default:[
      {id:"reset-breathing-open",name:"90/90 Breathing",dur:60,sets:1,sides:["Reset"],
       notes:"Start here. Downshift before mobility work.",
       cue:"Lie on your back with feet on a wall or chair, knees bent. Ribs down, pelvis heavy, five slow breaths into the low back."},
      {id:"glute-bridge",name:"Glute Bridge",dur:75,sets:2,sides:["Set 1","Set 2"],
       notes:"Stability before stretching. Stop if your low back takes over.",
       cue:"Feet even, ribs down. Drive through heels, squeeze glutes for three seconds at the top, lower with control."},
      {id:"side-plank",name:"Side Plank",dur:30,sets:4,sides:["Right 1","Left 1","Right 2","Left 2"],
       notes:"If left side feels less stable, add one extra left set after the routine.",
       cue:"Elbow under shoulder, ribs stacked over pelvis. Stay long; do not twist or sag."},
      {id:"bird-dog",name:"Bird Dog",dur:90,sets:2,sides:["Set 1","Set 2"],
       notes:"Slow eight reps per side. No hip rotation.",
       cue:"Brace lightly, reach long through opposite arm and leg, pause, then return without shifting your hips."},
      {id:"couch-stretch",name:"Couch / Half-Kneeling Psoas Stretch",dur:60,sets:1,sides:["Right"],
       notes:"Gentle hip-flexor opening after stability work. Use half-kneeling if couch setup irritates the back.",
       cue:"Back knee near wall or bench, glute squeezed, ribs stacked. Ease forward only until the front of the hip opens."},
      {id:"couch-stretch",name:"Couch / Half-Kneeling Psoas Stretch",dur:90,sets:1,sides:["Left"],
       notes:"Left side priority for the psoas/SI chain. Stop if it turns into low-back pressure.",
       cue:"Back knee near wall or bench, glute squeezed, ribs stacked. Keep the stretch in the front of the hip, not the low back."},
      {id:"hip-90-90",name:"90/90 Switches",dur:60,sets:1,sides:["Flow"],
       notes:"Controlled rotation, not max range.",
       cue:"Sit tall with both knees bent. Rotate side to side slowly, keeping the movement smooth and quiet."},
      {id:"figure-4",name:"Figure-4 / Pigeon",dur:60,sets:1,sides:["Right"],
       notes:"Figure-4 is the default. Only use pigeon if it does not tug the knee, hamstring, or SI area.",
       cue:"Find the glute/hip stretch only. No nerve pull, no hamstring tug, no forcing range."},
      {id:"figure-4",name:"Figure-4 / Pigeon",dur:90,sets:1,sides:["Left"],
       notes:"Left side priority. Gentle only; this is not a max-ROM drill.",
       cue:"Find the glute/hip stretch only. No nerve pull, no hamstring tug, no forcing range."},
      {id:"reset-breathing-close",name:"90/90 Breathing",dur:60,sets:1,sides:["Close"],
       notes:"Finish loose. Do not add extra hamstring stretching.",
       cue:"Ribs down, pelvis heavy, five slow breaths. Let the low back settle before sleep."},
    ],
  },
  days:{
    monday:{name:"Upper A · Strength",focus:"Strength",reps:"5-8",
      warmup:{cardio:"5 min bike",moves:[
        {name:"Band Pull-Aparts",rx:"15 reps"},
        {name:"Shoulder Halos (light KB/plate, 10-15 lbs)",rx:"8 per direction"},
      ],ramp:"1-2 ramp-up sets on your first press"},
      exercises:[
        {id:"flat-bench",name:"Barbell Flat Bench",sets:3,rr:[5,8],rest:150,sw:175,inc:5,unit:"lbs",anchor:true,notes:"Anchor · progresses +5/wk when all sets hit",cue:"Pinch your shoulder blades like you're holding a pencil between them, push the floor with your feet. Feel the chest stretch at the bottom, then squeeze it to press up"},
        {id:"seated-row",name:"Seated Row Machine",sets:2,rr:[5,8],rest:120,sw:160,inc:5,unit:"lbs",notes:"1s squeeze",cue:"Hands are hooks. Pull with your elbows and feel the middle of your back do the work, hold the squeeze one second"},
        {id:"smith-ohp",name:"Smith OHP",sets:2,rr:[5,8],rest:120,sw:85,inc:5,unit:"lbs",notes:"Brace hard",cue:"Squeeze your butt and belly into one solid pillar. Press straight up and feel your shoulders, not your arms, carry it"},
        {id:"lat-pulldown",name:"Lat Pulldown",sets:2,rr:[5,8],rest:120,sw:145,inc:5,unit:"lbs",notes:"Full stretch",cue:"Pull your elbows down into your back pockets, chest tall. Feel the muscles under your armpits do the pulling"},
        {id:"cable-fly",name:"Cable Fly",sets:2,rr:[12,15],rest:60,sw:15,inc:2.5,unit:"lbs/side",notes:"Finisher, RIR 2",cue:"Hug a barrel. Deep stretch across the chest when your arms are wide, squeeze the middle of your chest as your hands meet"},
      ]},
    tuesday:{name:"Lower A · Strength",focus:"Strength",reps:"5-8",
      warmup:{cardio:"5 min bike (easy pace)",moves:[
        {name:"Dead Bugs",rx:"10 per side, slow and controlled"},
        {name:"Half-Kneeling Psoas Stretch",rx:"30s per side, extra round on left"},
        {name:"QL Side Stretch",rx:"20s per side"},
      ],ramp:"1-2 ramp-up sets on your first exercise"},
      exercises:[
        {id:"deadlift",name:"Deadlift (BB)",sets:3,rr:[5,5],rest:180,sw:235,inc:10,unit:"lbs",anchor:true,notes:"Anchor · fixed 3×5, progresses +10/wk when reps hold",cue:"Wedge in, big breath, push the floor away. The bar stays on your legs the whole way"},
        {id:"leg-press",name:"Leg Press",sets:2,rr:[5,8],rest:120,sw:360,inc:10,unit:"lbs",notes:"Full depth",cue:"All the way down, drive through your whole foot. Feel your thighs load at the bottom"},
        {id:"lying-leg-curl",name:"Lying Leg Curl",sets:2,rr:[5,8],rest:90,sw:130,inc:5,unit:"lbs",notes:"3s eccentric",cue:"Pull your heels to your butt and squeeze the back of your thighs. Lower slow, three counts"},
        {id:"standing-calf",name:"Standing Calf Raise",sets:2,rr:[5,8],rest:90,sw:290,inc:10,unit:"lbs",notes:"2s pause top",cue:"Full stretch at the bottom, then drive up onto your big toe and hold the top for two"},
      ]},
    wednesday:{name:"Mobility + Arms",focus:"Core",reps:"10-15",
      warmup:{cardio:"5 min bike",note:"Mobility block first, then arms.",moves:[]},
      exercises:[
        {id:"incline-db-curl",name:"Incline DB Curl",sets:2,rr:[10,12],rest:0,sw:15,inc:2.5,unit:"lbs",notes:"Superset 1A · then OH rope extension",cue:"Let your arms hang all the way back and feel the biceps stretch. Curl without swinging"},
        {id:"oh-tricep-ext",name:"Overhead Tricep Extension",sets:2,rr:[10,12],rest:60,sw:40,inc:5,unit:"lbs",notes:"Superset 1B · rest 60s after this",cue:"Elbows tight by your head. Feel the back of your arms stretch deep, then squeeze to lock out"},
        {id:"cable-hammer-curl",name:"Cable Hammer Curl (Rope)",sets:2,rr:[10,12],rest:0,sw:30,inc:5,unit:"lbs",notes:"Superset 2A · then tricep pushdown",cue:"Thumbs up, elbows pinned to your sides. Squeeze at the top and feel the outside of your arms"},
        {id:"tricep-pushdown",name:"Tricep Pushdown",sets:2,rr:[10,12],rest:60,sw:50,inc:5,unit:"lbs",notes:"Superset 2B · rest 60s after this",cue:"Pin your elbows to your ribs. Squeeze the back of your arms hard at the bottom, let it up slow"},
        {id:"reverse-curl",name:"Reverse Curl",sets:2,rr:[12,15],rest:0,sw:40,inc:5,unit:"lbs",notes:"Superset 3A · then wrist curl",cue:"Knuckles up, curl slow. Feel the burn along the top of your forearms"},
        {id:"wrist-curl",name:"Wrist Curl",sets:2,rr:[12,15],rest:45,sw:20,inc:5,unit:"lbs",notes:"Superset 3B · rest 45s after this",cue:"Let the bar roll to your fingertips, curl it back up and squeeze your forearms"},
      ]},
    thursday:{name:"Upper B · Hypertrophy",focus:"Hypertrophy",reps:"10-12",
      warmup:{cardio:"5 min bike",moves:[
        {name:"Band Pull-Aparts",rx:"15 reps"},
        {name:"Shoulder Halos (light KB/plate, 10-15 lbs)",rx:"8 per direction"},
      ],ramp:"1-2 ramp-up sets on your first press"},
      exercises:[
        {id:"db-incline-press",name:"DB Incline Press",sets:2,rr:[10,12],rest:90,sw:40,inc:5,unit:"lbs/hand",notes:"30-45° bench",cue:"Feel the top of your chest stretch at the bottom. Drive the dumbbells up and in, then squeeze"},
        {id:"overhand-cable-row",name:"Overhand Cable Row",sets:2,rr:[10,12],rest:90,sw:110,inc:5,unit:"lbs",notes:"1s pause",cue:"Knuckles up, pull to your ribs. Pause and feel your upper back pinch for one second"},
        {id:"lateral-raise",name:"Cable Lateral Raise",sets:2,rr:[10,12],rest:60,sw:12.5,inc:2.5,unit:"lbs",notes:"Lead w/ elbows",cue:"Lead with your elbows, like pouring water from a pitcher. Feel the side of your shoulders float the weight"},
        {id:"low-high-cable-fly",name:"Low-to-High Cable Fly",sets:2,rr:[12,15],rest:60,sw:15,inc:2.5,unit:"lbs/side",notes:"Finisher, RIR 2",cue:"Sweep low to high and feel the top of your chest. Squeeze where your hands meet"},
        {id:"reverse-fly",name:"Reverse Fly",sets:2,rr:[10,12],rest:60,sw:25,inc:5,unit:"lbs",notes:"Rear delts",cue:"Lead with your elbows and pinch your shoulder blades. Feel the back of your shoulders, not your arms"},
      ]},
    friday:{name:"Lower B · Hypertrophy",focus:"Hypertrophy",reps:"10-12",
      warmup:{cardio:"5 min bike (easy pace)",moves:[
        {name:"Dead Bugs",rx:"10 per side, slow and controlled"},
        {name:"Half-Kneeling Psoas Stretch",rx:"30s per side, extra round on left"},
        {name:"QL Side Stretch",rx:"20s per side"},
      ],ramp:"1-2 ramp-up sets on your first exercise"},
      exercises:[
        {id:"leg-press",name:"Leg Press",sets:2,rr:[5,8],rest:120,sw:450,inc:10,unit:"lbs",anchor:true,notes:"Squat replacement while SI/psoas symptoms are active or unknown · progress only when both sets hit 8 clean",cue:"Brace, ribs down, pelvis quiet. Lower only as deep as you can without butt-wink, SI pinch, or hip-flexor grab; drive through your whole foot"},
        {id:"rdl",name:"Romanian Deadlift",sets:2,rr:[8,10],rest:90,sw:125,inc:10,unit:"lbs",notes:"Feel hamstrings",cue:"Push your hips back like you're closing a car door with your butt. The bar slides on your legs, feel the hamstrings stretch"},
        {id:"leg-extension",name:"Leg Extension",sets:2,rr:[10,12],rest:60,sw:120,inc:5,unit:"lbs",notes:"Full squeeze",cue:"Kick to full lockout and squeeze the front of your thigh hard for one second"},
        {id:"bulgarian-split-squat",name:"Bulgarian Split Squat (DB)",sets:2,rr:[10,12],rest:90,sw:25,inc:5,unit:"lbs/hand",notes:"Each leg",cue:"Back foot up, drop the back knee straight down. Drive up through the front heel and feel that glute"},
        {id:"seated-calf",name:"Seated Calf Raise",sets:2,rr:[10,12],rest:60,sw:90,inc:5,unit:"lbs",notes:"Slow full ROM",cue:"Targets soleus, full stretch at bottom, slow 2s up"},
      ]},
  },
  variants:{},
};
export const WU=w=>{if(!w||w<=0)return[];const s=[];
  if(w>=95)s.push({w:Math.round(w*.5/5)*5,r:10,l:"50%"});
  if(w>=135)s.push({w:Math.round(w*.7/5)*5,r:5,l:"70%"});
  if(w>=155)s.push({w:Math.round(w*.85/5)*5,r:3,l:"85%"});return s;};

// Progression is tracked by lift + rep range so strength and hypertrophy slots don't corrupt each other.
export const repTrack=rr=>(rr&&rr.length===2)?`${rr[0]}-${rr[1]}`:"default";
export const rrTxt=rr=>(rr&&rr.length===2)?(rr[0]===rr[1]?String(rr[0]):rr.join("-")):"";
export const progKey=(ex,slot)=>ex?.progKey||`${ex?.id}__${repTrack((slot||ex)?.rr)}`;
export const legacyAmbiguousIds=new Set(["leg-press","rdl","lying-leg-curl"]);
export const saneSet=s=>s&&s.done&&Number(s.reps)>0&&(Number(s.weight)>0||s.weight===0);
export const sameRepTrack=(a,b)=>repTrack(a)===repTrack(b);

export const WED_SUPERSETS={
  "incline-db-curl":"1A · pair with Overhead Tricep Extension",
  "oh-tricep-ext":"1B · rest 60s after this",
  "cable-hammer-curl":"2A · pair with Tricep Pushdown",
  "tricep-pushdown":"2B · rest 60s after this",
  "reverse-curl":"3A · pair with Wrist Curl",
  "wrist-curl":"3B · rest 45s after this",
};
export const supersetLabel=(day,ex)=>day==="wednesday"?WED_SUPERSETS[ex?.id]:null;

export const EXERCISE_LIBRARY=[
  // Chest fly / pre-exhaust
  {id:"cable-fly",name:"Cable Fly",pattern:"chest-fly",region:"chest",sw:15,unit:"lbs/side",inc:2.5,cue:"Slight forward lean, feel deep chest stretch, squeeze at center"},
  {id:"low-high-cable-fly",name:"Low-to-High Cable Fly",pattern:"chest-fly",region:"upper chest",sw:15,unit:"lbs/side",inc:2.5,cue:"Drive from low to high, feel upper chest, squeeze at top"},
  {id:"pec-deck",name:"Pec Deck",pattern:"chest-fly",region:"chest",sw:60,unit:"lbs",inc:5,cue:"Soft elbows, bring pads together with chest, slow return"},
  {id:"db-fly",name:"DB Fly",pattern:"chest-fly",region:"chest",sw:15,unit:"lbs/hand",inc:2.5,cue:"Small elbow bend, deep stretch, stop before shoulder strain"},
  // Chest press
  {id:"flat-bench",name:"Barbell Flat Bench",pattern:"chest-press",region:"chest",sw:175,unit:"lbs",inc:5,cue:"Retract scapula, feet driven into floor, touch and press"},
  {id:"converging-chest-press",name:"Converging Chest Press",pattern:"chest-press",region:"chest",sw:140,unit:"lbs",inc:5,cue:"Squeeze chest hard at peak contraction, controlled eccentric"},
  {id:"smith-flat-bench",name:"Smith Flat Bench",pattern:"chest-press",region:"chest",sw:135,unit:"lbs",inc:5,cue:"Retract scapula, drive through chest not shoulders"},
  {id:"smith-incline",name:"Smith Incline Press",pattern:"chest-press",region:"upper chest",sw:105,unit:"lbs",inc:5,cue:"Feel upper chest stretch at bottom, squeeze at top"},
  {id:"db-incline-press",name:"DB Incline Press",pattern:"chest-press",region:"upper chest",sw:40,unit:"lbs/hand",inc:5,cue:"30-45° bench, stretch under control, drive up and in"},
  {id:"machine-chest-press",name:"Machine Chest Press",pattern:"chest-press",region:"chest",sw:100,unit:"lbs",inc:5,cue:"Set handles mid-chest, pause lightly, press without shrugging"},
  // Rows / pulldowns
  {id:"seated-row",name:"Seated Row Machine",pattern:"horizontal-pull",region:"mid-back",sw:160,unit:"lbs",inc:5,cue:"Pull elbows past torso, squeeze mid-back hard"},
  {id:"overhand-cable-row",name:"Overhand Cable Row",pattern:"horizontal-pull",region:"upper back",sw:110,unit:"lbs",inc:5,cue:"Overhand grip hits upper back, pause and squeeze"},
  {id:"dumbbell-row",name:"DB Row",pattern:"horizontal-pull",region:"lats",sw:60,unit:"lbs/hand",inc:5,cue:"Row to hip, elbow close, full stretch at bottom"},
  {id:"chest-supported-row",name:"Chest-Supported Row",pattern:"horizontal-pull",region:"mid-back",sw:70,unit:"lbs",inc:5,cue:"Chest pinned, pull elbows back, no body English"},
  {id:"lat-pulldown",name:"Lat Pulldown",pattern:"vertical-pull",region:"lats",sw:145,unit:"lbs",inc:5,cue:"Drive elbows down to hips, feel lats stretch at top"},
  {id:"close-grip-pulldown",name:"Close-Grip Pulldown",pattern:"vertical-pull",region:"lats",sw:130,unit:"lbs",inc:5,cue:"Squeeze lats hard at bottom, full stretch at top"},
  {id:"pull-ups",name:"Pull-ups",pattern:"vertical-pull",region:"lats",sw:0,unit:"BW",inc:0,cue:"Full hang, drive elbows down, chest tall"},
  // Shoulders
  {id:"smith-ohp",name:"Smith OHP",pattern:"vertical-press",region:"shoulders",sw:85,unit:"lbs",inc:5,cue:"Brace core tight, press straight overhead not forward"},
  {id:"db-shoulder-press",name:"DB Shoulder Press",pattern:"vertical-press",region:"shoulders",sw:35,unit:"lbs/hand",inc:2.5,cue:"Press straight overhead, ribs down, control the bottom"},
  {id:"machine-shoulder-press",name:"Machine Shoulder Press",pattern:"vertical-press",region:"shoulders",sw:70,unit:"lbs",inc:5,cue:"Seat low enough to press from chin height, don't shrug"},
  {id:"lateral-raise",name:"Cable Lateral Raise",pattern:"lateral-delt",region:"side delts",sw:12.5,unit:"lbs",inc:2.5,cue:"Elbows above wrists, pour water out of a pitcher"},
  {id:"db-lateral-raise",name:"DB Lateral Raise",pattern:"lateral-delt",region:"side delts",sw:15,unit:"lbs/hand",inc:2.5,cue:"Lead with elbows, slight forward lean, stop at shoulder height"},
  {id:"reverse-fly",name:"Reverse Fly",pattern:"rear-delt",region:"rear delts",sw:25,unit:"lbs",inc:5,cue:"Pinch shoulder blades, lead with elbows not hands"},
  {id:"face-pull",name:"Face Pull",pattern:"rear-delt",region:"rear delts",sw:40,unit:"lbs",inc:5,cue:"Pull to forehead, elbows high, rotate thumbs back"},
  // Quads / squat patterns
  {id:"back-squat",name:"Back Squat (BB)",pattern:"squat",region:"quads",sw:135,unit:"lbs",inc:10,cue:"Brace hard, sit between your legs, drive up out of the hole"},
  {id:"front-squat",name:"Front Squat (BB)",pattern:"squat",region:"quads",sw:135,unit:"lbs",inc:5,cue:"Elbows up, sit between legs, drive out of hole"},
  {id:"hack-squat",name:"Hack Squat",pattern:"squat",region:"quads",sw:180,unit:"lbs",inc:10,cue:"Knees track over toes, stay upright through core"},
  {id:"leg-press",name:"Leg Press",pattern:"squat",region:"quads",sw:300,unit:"lbs",inc:10,cue:"Full depth, drive through whole foot not just toes"},
  {id:"goblet-squat",name:"Goblet Squat (DB)",pattern:"squat",region:"quads",sw:50,unit:"lbs",inc:5,cue:"Elbows inside knees, chest up, sit into hips"},
  {id:"leg-extension",name:"Leg Extension",pattern:"knee-extension",region:"quads",sw:70,unit:"lbs",inc:5,cue:"Lock out at top, squeeze quad hard, slow eccentric"},
  // Hip hinge / hamstrings
  {id:"deadlift",name:"Deadlift (BB)",pattern:"hinge",region:"posterior chain",sw:235,unit:"lbs",inc:10,cue:"Wedge in, brace hard, push the floor away · bar stays close"},
  {id:"rdl",name:"Romanian Deadlift",pattern:"hinge",region:"hamstrings",sw:125,unit:"lbs",inc:10,cue:"Push hips back like closing a car door, bar stays on legs"},
  {id:"sldl",name:"Stiff-Leg Deadlift",pattern:"hinge",region:"hamstrings",sw:95,unit:"lbs",inc:10,cue:"Slight knee bend, hinge at hips, feel hamstring stretch"},
  {id:"cable-pull-through",name:"Cable Pull-Through",pattern:"hinge",region:"glutes/hamstrings",sw:70,unit:"lbs",inc:5,cue:"Push hips back, squeeze glutes at top, arms are hooks"},
  {id:"lying-leg-curl",name:"Lying Leg Curl",pattern:"leg-curl",region:"hamstrings",sw:90,unit:"lbs",inc:5,cue:"Drive heels toward glutes, squeeze hamstrings at peak"},
  {id:"seated-leg-curl",name:"Seated Leg Curl",pattern:"leg-curl",region:"hamstrings",sw:90,unit:"lbs",inc:5,cue:"Pin hips down, curl smoothly, slow negative"},
  // Calves / arms
  {id:"standing-calf",name:"Standing Calf Raise",pattern:"calf",region:"calves",sw:180,unit:"lbs",inc:10,cue:"Full stretch at bottom, drive up on big toe"},
  {id:"seated-calf",name:"Seated Calf Raise",pattern:"calf",region:"calves",sw:90,unit:"lbs",inc:5,cue:"Targets soleus, full stretch at bottom, slow 2s up"},
  {id:"incline-db-curl",name:"Incline DB Curl",pattern:"biceps",region:"biceps",sw:15,unit:"lbs/hand",inc:2.5,cue:"Let arms hang fully stretched, don't swing"},
  {id:"cable-curl",name:"Cable Curl",pattern:"biceps",region:"biceps",sw:35,unit:"lbs",inc:5,cue:"Keep elbows forward, squeeze at top"},
  {id:"preacher-curl",name:"Preacher Curl",pattern:"biceps",region:"biceps",sw:40,unit:"lbs",inc:5,cue:"Full stretch at bottom, squeeze hard at top"},
  {id:"cable-hammer-curl",name:"Cable Hammer Curl (Rope)",pattern:"brachialis",region:"arms",sw:30,unit:"lbs",inc:5,cue:"Neutral grip, keep elbows pinned, squeeze at top"},
  {id:"db-hammer-curl",name:"DB Hammer Curl",pattern:"brachialis",region:"arms",sw:20,unit:"lbs/hand",inc:2.5,cue:"Thumbs up, no swing, control the negative"},
  {id:"oh-tricep-ext",name:"Overhead Tricep Extension",pattern:"triceps",region:"triceps",sw:40,unit:"lbs",inc:5,cue:"Keep elbows tight, stretch tricep fully, squeeze at top"},
  {id:"tricep-pushdown",name:"Tricep Pushdown",pattern:"triceps",region:"triceps",sw:50,unit:"lbs",inc:5,cue:"Pin elbows at sides, squeeze at bottom, control eccentric"},
  {id:"reverse-curl",name:"Reverse Curl",pattern:"forearms",region:"forearms",sw:40,unit:"lbs",inc:5,cue:"Overhand grip, slow controlled curl, feel forearms burn"},
  {id:"wrist-curl",name:"Wrist Curl",pattern:"forearms",region:"forearms",sw:20,unit:"lbs",inc:5,cue:"Let bar roll to fingertips, curl back up, squeeze forearms"},
];
export const exLibById=Object.fromEntries(EXERCISE_LIBRARY.map(e=>[e.id,e]));
// Short display names for strips/charts: drop filler words, keep the lift word.
export const SHORT_FILLER=new Set(["barbell","db","bb","machine","smith","seated","lying","standing","cable","(bb)","(db)"]);
export const shortLiftName=n=>{const ws=(n||"").replace(/[()]/g,"").split(" ").filter(w=>!SHORT_FILLER.has(w.toLowerCase()));return(ws[ws.length-1]||n||"").toUpperCase().slice(0,8);};
// Stick-figure pose diagrams for the guided stretch (mock 6e) · 72×56 viewBox,
// hl = the ember-highlighted segment where you should feel it.
export const STRETCH_POSES={
  "hip-flexor":{pose:"M10,38 L24,50 L36,38 L52,40 L54,52 M36,38 L36,18 M36,22 L46,34",hl:"M24,50 L36,38",hx:36,hy:11},
  "hip-90-90":{pose:"M30,44 L16,48 L10,40 M30,44 L44,48 L52,42 M30,44 L40,22",hl:"M30,44 L16,48",hx:43,hy:16},
  "pigeon":{pose:"M8,50 L30,46 L46,50 L32,52 M30,46 L42,22 M42,24 L54,46",hl:"M30,46 L46,50",hx:44,hy:15},
  "psoas-release":{prop:"M6,34 h34 v18 h-34 z",pose:"M10,30 L36,30 M36,30 L46,44 L48,52 M28,30 L34,18",hl:"M36,30 L46,44",hx:8,hy:26},
  "spinal-twist":{pose:"M10,50 L50,50 M34,50 L28,36 L18,40",hl:"M28,36 L18,40",hx:54,hy:46},
};
export const weightCap=ex=>{
  const p=(exLibById[ex?.id]?.pattern||ex?.pattern||"");
  const unit=ex?.unit||exLibById[ex?.id]?.unit||"";
  if(unit==="BW")return 0;
  if(["chest-fly","lateral-delt","rear-delt"].includes(p))return unit.includes("side")||unit.includes("hand")?60:120;
  if(["biceps","brachialis","triceps","forearms"].includes(p))return unit.includes("hand")?70:120;
  if(["chest-press"].includes(p))return unit.includes("hand")?100:350;
  if(["horizontal-pull","vertical-pull"].includes(p))return unit.includes("hand")?120:300;
  if(["vertical-press"].includes(p))return unit.includes("hand")?100:200;
  if(["leg-curl","knee-extension"].includes(p))return 220;
  if(["calf"].includes(p))return 450;
  if(["squat"].includes(p))return ex?.id==="leg-press"?700:405;
  if(["hinge"].includes(p))return 405;
  return 350;
};
export const saneWeight=(ex,w)=>w==null||Number(w)<=weightCap(ex);
export const cutStepsTarget=(settings)=>Math.max(Number(settings?.steps)||DEFAULTS.steps,DEFAULTS.steps);
export const CUT_HOLD_PROGRESSION=true;
export const matchingProgKeys=(ex)=>{
  if(!ex?.id)return[];
  const keys=[ex.id];
  if(ex.progKey)keys.unshift(ex.progKey);
  if(ex.rr)keys.unshift(progKey(ex,ex));
  return [...new Set(keys)];
};
export const getProgEntry=(prog,ex)=>matchingProgKeys(ex).map(k=>prog?.[k]).find(Boolean)||null;
export const getProgHistory=(prog,ex)=>matchingProgKeys(ex).flatMap(k=>prog?.[k]?.e1rmHistory||[]);
export const getProgPr=(prog,ex)=>matchingProgKeys(ex).map(k=>prog?.[k]?.pr).filter(Boolean).sort((a,b)=>(b.e1rm||0)-(a.e1rm||0))[0]||null;
export const relatedPatterns={
  "chest-press":["chest-press"],"chest-fly":["chest-fly","chest-press"],
  "horizontal-pull":["horizontal-pull","vertical-pull"],"vertical-pull":["vertical-pull","horizontal-pull"],
  "vertical-press":["vertical-press"],"lateral-delt":["lateral-delt","rear-delt"],"rear-delt":["rear-delt","horizontal-pull"],
  "squat":["squat","knee-extension"],"knee-extension":["knee-extension","squat"],"hinge":["hinge","leg-curl"],"leg-curl":["leg-curl","hinge"],
  "calf":["calf"],"biceps":["biceps","brachialis"],"brachialis":["brachialis","biceps"],"triceps":["triceps"],"forearms":["forearms","brachialis"]
};

// Dinner rotation from the Jul 6 cut plan. Shared dinners, two plate sizes.
export const DINNERS={
  monday:{name:"Sheet-pan salmon",tag:"FISH 1/3",how:"Salmon, baby potatoes, broccoli. One pan, 425°F, about 18 minutes.",you:"~720 · 48g",dani:"~480 · 32g"},
  tuesday:{name:"Salsa chicken bowls",tag:"PREPPED, ZERO COOK",how:"Reheat salsa chicken, microwave rice, quick peppers. Fage crema on top.",you:"~650 · 55g",dani:"~430 · 35g"},
  wednesday:{name:"Fast day",tag:"36 H FAST",how:"You fast until Thursday breakfast. Danielle eats normally: rotisserie chicken, microwave rice, bagged salad.",you:"0",dani:"~430 · 35g"},
  thursday:{name:"Air fryer shrimp or cod",tag:"FISH 2/3",how:"Frozen shrimp or cod, air fryer 8 to 10 minutes, rice, asparagus.",you:"~620 · 58g",dani:"~400 · 36g"},
  friday:{name:"Taco bowls",tag:"ONE SKILLET",how:"Ground turkey, taco seasoning, rice, peppers, Fage crema, salsa.",you:"~680 · 52g",dani:"~450 · 33g"},
  saturday:{name:"Grill night",tag:"COOK TOGETHER · FISH 3/3",how:"Steak or salmon, baked potato, big salad. The one real cooking night.",you:"~750 · 55g",dani:"~520 · 36g"},
  sunday:{name:"Prep-day dinner",tag:"WHILE PREP RUNS",how:"Extra salsa chicken bowls, or shrimp stir-fry with frozen veg.",you:"~600 · 50g",dani:"~430 · 32g"},
};

export const CARDIO_PRESETS=[
  {type:"stairs",label:"Stairs",duration:20,intensity:"zone2"},
  {type:"incline-walk",label:"Incline Walk",duration:20,intensity:"zone2"},
  {type:"peloton",label:"Peloton",duration:35,intensity:"zone2"},
  {type:"walk",label:"Walk",duration:30,intensity:"easy"},
  {type:"bike",label:"Bike",duration:30,intensity:"zone2"},
  {type:"rowing",label:"Row",duration:15,intensity:"hard"},
];
export const CARDIO_TYPES=["peloton","bike","walk","incline-walk","stairs","rowing","other"];
export const cardioLabel=t=>(CARDIO_PRESETS.find(p=>p.type===t)?.label||String(t||"cardio").replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase()));
export const intensityLabel=i=>({easy:"Easy",zone2:"Zone 2",tempo:"Tempo",hard:"Hard",hiit:"HIIT"}[i]||i||"Zone 2");
export const cardioSummary=c=>{
  if(!c)return"";
  const parts=[cardioLabel(c.type),c.duration?`${c.duration}m`:null,intensityLabel(c.intensity)].filter(Boolean);
  const metrics=[c.distance?`${c.distance} mi`:null,c.calories?`${c.calories} cal`:null].filter(Boolean);
  return `${parts.join(" · ")}${metrics.length?` · ${metrics.join(" · ")}`:""}`;
};

export const DEFAULTS={calories:1790,protein:200,water:128,steps:15000,sleep:7.5,fiber:30,trainingCal:2000,wednesdayCal:900,weekendCal:1800,customHabits:[],
  notifications:{enabled:false,restTimer:true,timers:true,sound:true,vibrate:true},
  // Dormant: reminder system removed 2026-07-11 (rest timer is the only
  // notification). Preferences kept for a future server-push implementation.
  reminders:{enabled:false,weighIn:"08:00",closeout:"20:30"}};
export const bl=()=>({wk:{},nut:{},wt:{},rec:{},prog:{},steps:{},mob:{},stp:{},debrief:{},habits:{},water:{},cardio:{},bodyComp:{},bodyMeas:{},photoSlots:{},travelDays:{},tdeeExclude:{},autoregLog:{},lytes:{},coachLog:[],programVersion:null,tdeeCal:null,socialWeekend:{active:false,weekOf:null},settings:{...DEFAULTS},program:JSON.parse(JSON.stringify(PROG.days))});
export const migrate=(d)=>{const b=bl();const rawMob=d.mob||{};const mob={};
  for(const[date,v]of Object.entries(rawMob)){mob[date]=v===true?{done:true,dur:null}:v;}
  return{...b,...d,
  wk:d.wk||d.workoutLog||{},nut:d.nut||d.nutritionLog||{},wt:d.wt||d.weightLog||{},
  rec:d.rec||d.recoveryLog||{},steps:d.steps||{},prog:d.prog||d.progressionState||{},
  mob,stp:d.stp||{},debrief:d.debrief||{},habits:d.habits||{},water:d.water||{},
  cardio:d.cardio||{},bodyComp:d.bodyComp||{},travelDays:d.travelDays||{},
  settings:{...DEFAULTS,...(d.settings||{})},program:d.program||JSON.parse(JSON.stringify(PROG.days))};};

// Historical data seed for TDEE bootstrap
export const SEED_DATA=[
  {date:"2026-03-09",cal:1986,protein:172,carbs:152,fat:55,weight:188.7},
  {date:"2026-03-10",cal:1844,protein:176,carbs:175,fat:49,weight:188.2},
  {date:"2026-03-11",cal:2119,protein:200,carbs:231,fat:52,weight:188.5},
  {date:"2026-03-12",cal:2358,protein:208,carbs:229,fat:65,weight:186.5},
  {date:"2026-03-13",cal:2602,protein:217,carbs:213,fat:107,weight:185.0},
  {date:"2026-03-14",cal:2809,protein:212,carbs:215,fat:157,weight:181.4},
  {date:"2026-03-15",cal:3000,protein:180,carbs:0,fat:0,weight:182.8},
];
export const seedHistorical=(d)=>{
  for(const s of SEED_DATA){
    if(!d.wt[s.date])d.wt[s.date]=s.weight;
    if(!d.nut[s.date]||!d.nut[s.date].totalCal){
      d.nut[s.date]={meals:[{description:"MFP Import",cal:s.cal,protein:s.protein,carbs:s.carbs,fat:s.fat,fiber:0,source:"import"}],
        totalCal:s.cal,totalProtein:s.protein,totalCarbs:s.carbs,totalFat:s.fat,totalFiber:0};
    }
  }
  return d;
};

// Meal list → daily totals (Food tab, coach log_meal, tests).
export const sumMeals=ms=>({meals:ms,totalCal:Math.round(ms.reduce((s,m)=>s+(Number(m.cal)||0),0)),totalProtein:Math.round(ms.reduce((s,m)=>s+(Number(m.protein)||0),0)*10)/10,
  totalCarbs:Math.round(ms.reduce((s,m)=>s+(Number(m.carbs)||0),0)*10)/10,totalFat:Math.round(ms.reduce((s,m)=>s+(Number(m.fat)||0),0)*10)/10,totalFiber:Math.round(ms.reduce((s,m)=>s+(Number(m.fiber)||0),0)*10)/10});
export const lds=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
export const td=()=>lds(new Date());
export const yd=()=>{const d=new Date();d.setDate(d.getDate()-1);return lds(d)};
export const dw=s=>["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date(s+"T12:00:00").getDay()];
export const fmt=s=>new Date(s+"T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
export const wkn=s=>{const a=new Date(PROG.start+"T12:00:00"),b=new Date(s+"T12:00:00");return Math.max(1,Math.floor((b-a)/6048e5)+1);};
export const estTime=(sess)=>{if(!sess)return"";
  const wu=5+(sess.warmup?.moves?.length||0)*1+(sess.warmup?.ramp?3:0);
  const wuSets=(sess.exercises||[]).reduce((t,ex)=>t+(WU(ex.sw).length||0)*0.75,0);
  const work=(sess.exercises||[]).reduce((t,ex)=>t+ex.sets*0.5+(ex.sets-1)*(ex.rest/60),0);
  const stretch=(PROG.mobility?._default||PROG.mobility?.[Object.keys(PROG.mobility)[0]]||[]).reduce((t,s)=>t+((s.dur||60)*(s.sets||2))/60,0);
  return Math.round(wu+wuSets+work+stretch);
};

export const fmtElapsed=(secs)=>{
  const h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60),s=secs%60;
  if(h>0)return `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  return `${m}:${String(s).padStart(2,"0")}`;
};

// ═══ DAY-TYPE HELPERS ═══
export const getDayType=(dateStr,travelDays)=>{
  if(travelDays?.[dateStr])return"travel";
  const day=dw(dateStr);
  if(day==="wednesday")return"wednesday";
  if(["monday","tuesday","thursday","friday"].includes(day))return"training";
  return"weekend";
};
// ═══ SOCIAL WEEKEND ═══
export const getWeekMonday=(dateStr)=>{
  const d=new Date(dateStr+"T12:00:00");const dow=d.getDay();
  const diff=dow===0?-6:1-dow;d.setDate(d.getDate()+diff);return lds(d);
};
export const isSocialWeekendActive=(dateStr,socialWeekend)=>{
  if(!socialWeekend?.active)return false;
  return getWeekMonday(dateStr)===socialWeekend.weekOf;
};
export const SOCIAL_CAL={monday:1700,tuesday:1700,wednesday:800,thursday:1700};

export const getDayCalTarget=(dateStr,settings,travelDays,socialWeekend)=>{
  const dt=getDayType(dateStr,travelDays);
  if(dt==="travel")return settings?.trainingCal||2000;
  const sw=isSocialWeekendActive(dateStr,socialWeekend);
  if(sw){
    const day=dw(dateStr);
    if(["friday","saturday","sunday"].includes(day))return null;
    return SOCIAL_CAL[day]||1700;
  }
  if(dt==="wednesday")return settings?.wednesdayCal||900;
  if(dt==="training")return settings?.trainingCal||2000;
  // weekendCal is the Sat/Sun average · Saturday runs +100, Sunday -100 (e.g. 1800 avg → 1900/1700)
  const wknd=settings?.weekendCal||1800;
  return dw(dateStr)==="saturday"?wknd+100:wknd-100;
};
export const getDayProTarget=(dateStr,settings,travelDays,socialWeekend)=>{
  const dt=getDayType(dateStr,travelDays);
  if(dt==="travel")return settings?.protein||200;
  const sw=isSocialWeekendActive(dateStr,socialWeekend);
  if(sw&&["friday","saturday","sunday"].includes(dw(dateStr)))return 180;
  if(dt==="wednesday")return 150;
  if(dt==="training")return settings?.protein||200;
  if(["saturday","sunday"].includes(dw(dateStr)))return 180;
  return 150;
};
export const PROTEIN_CHECKPOINTS=[
  {label:"Post-Workout Shake",target:50,time:"~7 AM"},
  {label:"After Meal 1",target:110,time:"~1 PM"},
  {label:"After Meal 2",target:170,time:"~5 PM"},
  {label:"End of Day",target:200,time:"~7:30 PM"},
];

// ═══ AUTOREGULATION ═══
export const getWeeklyRecoveryAvg=(rec)=>{
  const now=new Date();const entries=[];
  for(let i=0;i<7;i++){const d=new Date(now);d.setDate(d.getDate()-i);
    const ds=lds(d);
    if(rec[ds]?.recoveryScore)entries.push(rec[ds].recoveryScore);}
  return entries.length>=3?Math.round(entries.reduce((a,b)=>a+b,0)/entries.length):null;
};
export const getAutoregulation=(avgRec)=>{
  if(avgRec===null)return null;
  if(avgRec>=70)return{level:"green",msg:"Run full plan. Progress only if earned.",action:"All lifts as planned. Keep cardio steady; no extra stress chasing PRs."};
  if(avgRec>=55)return{level:"yellow",msg:"Recovery dipping. Reduce cardio stress first.",action:"Keep lifting. Drop to 1 Peloton session and check sleep/food before changing calories."};
  return{level:"red",msg:"Recovery low. Protect lifting and pull back cardio.",action:"Skip Peloton/stairmaster. Use minimum effective lifting only until recovery rebounds."};
};
export const getConsecutiveRedDays=(rec)=>{
  let count=0;const now=new Date();
  for(let i=0;i<7;i++){const d=new Date(now);d.setDate(d.getDate()-i);
    const ds=lds(d);
    if(rec[ds]?.recoveryScore&&rec[ds].recoveryScore<34)count++;else break;}
  return count;
};

// ═══ VOLUME & E1RM ═══
export const e1rm=(w,r)=>r<=0||w<=0?0:r===1?w:Math.round(w*(1+r/30));
export const calcVolume=(exercises)=>exercises.reduce((t,ex)=>t+ex.sets.filter(s=>s.done).reduce((s,set)=>s+(set.weight||0)*set.reps,0),0);

export const completedSets=sets=>(sets||[]).filter(saneSet);
export const nextWeightFromSets=(sets,pe)=>{const cs=completedSets(sets);if(!cs.length)return null;const rr=pe?.rr;const matching=rr?cs.filter(s=>Number(s.reps)>=rr[0]&&Number(s.reps)<=rr[1]):cs;if(!matching.length)return null;const cw=Number(matching[0].weight);const hit=rr&&pe?.inc>0&&matching.length>=(pe.sets||1)&&matching.every(s=>Number(s.reps)>=rr[1]);return hit?cw+pe.inc:cw;};

export const BACKFILL_VERSION=2;
export const backfillData=(d)=>{
  Object.entries(d.wk||{}).forEach(([date,w])=>{if(!w.volume&&w.exercises){try{w.volume=calcVolume(w.exercises);}catch(e){}}});
  // History replay is a versioned one-shot. It previously ran on every load and
  // paired logged exercises to program exercises BY SLOT INDEX, so any program
  // mutation (swap/add/remove/reorder) wrote historical sets into the wrong lift.
  if((d.backfillVersion||0)>=BACKFILL_VERSION)return d;
  if(d.prog["seated-leg-curl"]&&!d.prog["lying-leg-curl"]){d.prog["lying-leg-curl"]=d.prog["seated-leg-curl"];delete d.prog["seated-leg-curl"];}
  const allDays={...PROG.days,...(d.program||{})};
  const byProgKey={},byId={};
  Object.values(allDays).forEach(day=>(day.exercises||[]).forEach(pe=>{
    const k=progKey(pe,pe);if(!byProgKey[k])byProgKey[k]=pe;if(!byId[pe.id])byId[pe.id]=pe;}));
  Object.entries(d.wk||{}).sort((a,b)=>a[0].localeCompare(b[0])).forEach(([date,w])=>{
    if(!w.exercises)return;
    w.exercises.forEach(ex=>{
      // Identity pairing only: progKey, else exercise id. Unknown -> skip, never guess.
      const pe=(ex.progKey&&byProgKey[ex.progKey])||(ex.id&&byId[ex.id])||null;
      if(!pe||!ex.sets)return;
      const key=ex.progKey||progKey(pe,pe);
      const cs=completedSets(ex.sets);if(!cs.length)return;
      const bestSet=cs.reduce((best,s)=>e1rm(s.weight||0,s.reps)>e1rm(best.weight||0,best.reps)?s:best,cs[0]);
      const newE1rm=e1rm(bestSet.weight||0,bestSet.reps);if(newE1rm<=0)return;
      const nextWeight=nextWeightFromSets(ex.sets,pe);
      if(!d.prog[key])d.prog[key]={currentWeight:nextWeight??bestSet.weight,lastReps:cs.map(s=>s.reps),lastDate:date,progressed:false,exerciseId:pe.id,repRange:pe.rr,name:pe.name};
      if(!d.prog[key].e1rmHistory)d.prog[key].e1rmHistory=[];
      if(!d.prog[key].e1rmHistory.some(h=>h.date===date))d.prog[key].e1rmHistory.push({date,e1rm:newE1rm});
      d.prog[key].e1rmHistory=d.prog[key].e1rmHistory.slice(-12);
      if(nextWeight!=null&&date>=(d.prog[key].lastDate||"")){d.prog[key].currentWeight=nextWeight;d.prog[key].lastReps=cs.map(s=>s.reps);d.prog[key].lastDate=date;d.prog[key].progressed=nextWeight>Number(cs[0].weight);}
      if(!d.prog[key].pr||newE1rm>d.prog[key].pr.e1rm){d.prog[key].pr={name:pe.name,weight:bestSet.weight,reps:bestSet.reps,e1rm:newE1rm,date};}
    });
  });
  d.backfillVersion=BACKFILL_VERSION;
  return d;
};

// Prune orphaned/fossil progression records. Runs every boot (cheap filter) so
// rows the cleanup migration removed server-side can't be resurrected from a
// stale local copy or vice versa. Keeps: current id__rr keys; plain legacy IDs
// of current non-ambiguous exercises that hold real reps (the gw() fallback
// reads those); anything logged during the current block (protects history of
// exercises swapped out mid-block).
export const pruneProgression=(d)=>{
  const days=d.program||PROG.days;
  const currentKeys=new Set(Object.values(days).flatMap(day=>(day.exercises||[]).map(pe=>progKey(pe,pe))));
  const currentIds=new Set(Object.values(days).flatMap(day=>(day.exercises||[]).map(pe=>pe.id)));
  const removed=[];
  for(const[key,p]of Object.entries(d.prog||{})){
    if(currentKeys.has(key))continue;
    if(p?.lastDate&&p.lastDate>=PROG.start)continue;
    const isPlain=!key.includes("__");
    const hasRealReps=(p?.lastReps||[]).some(r=>Number(r)>0);
    if(isPlain&&currentIds.has(key)&&!legacyAmbiguousIds.has(key)&&hasRealReps)continue;
    removed.push(key);delete d.prog[key];
  }
  if(removed.length)console.log(`[prune] Removed ${removed.length} orphaned progression records:`,removed.join(", "));
  return removed.length;
};

export const repairDeloadProgression=(d)=>{
  const allDays={...PROG.days,...(d.program||{})};
  const allEx=Object.values(allDays).flatMap(day=>day.exercises||[]);
  for(const pe of allEx){
    const key=progKey(pe,pe);
    const dates=Object.entries(d.wk||{}).filter(([date])=>wkn(date)!==PROG.deload).sort((a,b)=>b[0].localeCompare(a[0]));
    for(const[date,w]of dates){
      const wex=w.exercises?.find(e=>e.progKey===key)||w.exercises?.find(e=>e.id===pe.id&&completedSets(e.sets).some(s=>Number(s.reps)>=pe.rr[0]&&Number(s.reps)<=pe.rr[1]));
      if(!wex)continue;
      const correctWeight=nextWeightFromSets(wex.sets,pe);if(correctWeight==null)continue;
      if(d.prog[key]?.currentWeight&&d.prog[key].currentWeight<correctWeight*0.75){d.prog[key].currentWeight=correctWeight;}
      else if(!d.prog[key]){d.prog[key]={currentWeight:correctWeight,lastReps:completedSets(wex.sets).map(s=>s.reps),lastDate:date,progressed:false,exerciseId:pe.id,repRange:pe.rr,name:pe.name};}
      break;
    }
  }
  return d;
};

// ═══ BLOCK V2 MIGRATION (Summer Cut v2, 2026-07-06) ═══
export const BLOCK_V2_SEEDS={
  "flat-bench__5-8":{currentWeight:175,exerciseId:"flat-bench",repRange:[5,8],name:"Barbell Flat Bench"},
  "deadlift__5-5":{currentWeight:235,exerciseId:"deadlift",repRange:[5,5],name:"Deadlift (BB)"},
};
// Known logging errors in the prog store · each fails the sanity cap for its movement
export const BLOCK_V2_WEIGHT_FIXES={"reverse-curl":40,"cable-hammer-curl":35,"db-incline-press":45};
export const applyBlockV2=(d)=>{
  let changed=false;
  // Stored program belongs to another block version → replace with the code's days.
  // Same version → keep it, so coach edits (swap/add/remove/update) persist.
  if(d.programVersion!==PROG.version||!d.program||!Object.keys(d.program).length){
    d.program=JSON.parse(JSON.stringify(PROG.days));d.programVersion=PROG.version;changed=true;
  }
  for(const[key,seed]of Object.entries(BLOCK_V2_SEEDS)){
    if(!getProgEntry(d.prog,{id:seed.exerciseId,rr:seed.repRange})){
      d.prog[key]={...seed,lastReps:[],lastDate:null,progressed:false,pr:null,e1rmHistory:[]};changed=true;
    }
  }
  for(const[key,p]of Object.entries(d.prog||{})){
    const baseId=p?.exerciseId||key.split("__")[0];
    const fix=BLOCK_V2_WEIGHT_FIXES[baseId];
    if(fix!=null&&p?.currentWeight!=null&&!saneWeight(exLibById[baseId],p.currentWeight)){
      p.currentWeight=fix;changed=true;
    }
  }
  // One-time settings move to the v2 targets; only touches values still at their v1 defaults
  // so later manual adjustments are never clobbered.
  if(!d.blockV2SettingsApplied){
    const remap={calories:[1800,1790],trainingCal:[1800,2000],weekendCal:[1700,1800]};
    for(const[k,[oldV,newV]]of Object.entries(remap)){
      if(d.settings?.[k]==null||d.settings[k]===oldV){d.settings={...d.settings,[k]:newV};changed=true;}
    }
    d.blockV2SettingsApplied=true;changed=true;
  }
  return changed;
};

// ═══ STALL DETECTION ═══
export const getStalls=(prog,wk,programDays)=>{
  // Cut mode: flag when weight DROPS on same lift for 2 consecutive sessions
  const days=programDays||PROG.days;
  const stalls=[];
  const programExIds=new Set(Object.values(days).flatMap(d=>d&&d.exercises||[]).map(e=>e.id));
  Object.entries(prog).forEach(([id,p])=>{
    if(!p.lastDate)return;
    const baseId=p.exerciseId||id.split("__")[0];
    if(!programExIds.has(baseId))return;
    const sessions=Object.entries(wk)
      .filter(([_,w])=>w.exercises?.some(e=>e.id===baseId||e.progKey===id))
      .map(([d,w])=>{const ex=w.exercises.find(e=>e.id===baseId||e.progKey===id);const cs=ex?.sets?.filter(s=>s.done&&s.weight>0)||[];return cs.length?{date:d,weight:Math.max(...cs.map(s=>s.weight))}:null;})
      .filter(Boolean).sort((a,b)=>b.date.localeCompare(a.date));
    if(sessions.length<3)return;
    // Check if last 2 sessions both dropped weight vs the session before them
    const baseline=sessions[2].weight;
    if(sessions[0].weight<baseline&&sessions[1].weight<baseline){
      const exDef=Object.values(days).flatMap(d=>d&&d.exercises||[]).find(e=>e.id===baseId);
      const drop=baseline-sessions[0].weight;
      stalls.push({id,name:exDef?.name||p.name||baseId,weeks:2,currentWeight:sessions[0].weight,drop});
    }
  });
  return stalls;
};

// ═══ WEIGHT TREND · the one shared engine ═══
// EWMA-smoothed OLS slope over the last 14 calendar days, in lbs/week to one
// decimal. Every trend surface consumes this; do not add another formula.
// lbs/week from dated entries: EWMA(0.3)-smoothed OLS slope. getTrend and the
// TDEE estimator both use this so the phone and the coach never disagree.
export const slopePerWeek=(entries,alpha=0.3)=>{
  const n=entries.length;if(n<2)return 0;
  const smoothed=calcEWMA(entries.map(([,v])=>Number(v)),alpha);
  const base=new Date(entries[0][0]+"T12:00:00");
  const xs=entries.map(([dt])=>(new Date(dt+"T12:00:00")-base)/864e5);
  const mx=xs.reduce((s,v)=>s+v,0)/n,my=smoothed.reduce((s,v)=>s+v,0)/n;
  let num=0,den=0;for(let i=0;i<n;i++){num+=(xs[i]-mx)*(smoothed[i]-my);den+=(xs[i]-mx)**2;}
  return (den?num/den:0)*7;
};
export const getTrend=(wt,today=td())=>{
  const start=(()=>{const d=new Date(today+"T12:00:00");d.setDate(d.getDate()-13);return lds(d);})();
  const entries=Object.entries(wt||{}).filter(([dt,v])=>v!=null&&dt>=start&&dt<=today).sort((a,b)=>a[0].localeCompare(b[0]));
  const n=entries.length;
  if(n<2)return null;
  const smoothed=calcEWMA(entries.map(([,v])=>Number(v)),0.3);
  const rate=+slopePerWeek(entries).toFixed(1);
  const direction=rate<=-0.1?"down":rate>=0.1?"up":"flat";
  const message=direction==="down"?`Down ${Math.abs(rate)} lb/wk`:direction==="up"?`Up ${rate} lb/wk`:"Holding steady";
  const weekAgo=(()=>{const d=new Date(today+"T12:00:00");d.setDate(d.getDate()-6);return lds(d);})();
  const weighIns7=entries.filter(([dt])=>dt>=weekAgo).length;
  return{rate,direction,message,n,weighIns7,
    current:Math.round(entries[n-1][1]),
    points:entries.map(([dt,v],i)=>({d:dt.slice(5),v:+smoothed[i].toFixed(1),raw:v}))};
};

// ═══ DATA INTELLIGENCE ═══
export const getTopProteinMeals=(data,limit=5)=>{
  const map={};
  for(const[d,n] of Object.entries(data.nut||{})){
    for(const m of(n.meals||[])){
      if(!m.description||(m.cal||0)<50)continue;
      const k=m.description.toLowerCase().trim();
      if(!map[k])map[k]={desc:m.description,tp:0,tc:0,n:0};
      map[k].tp+=(m.protein||0);map[k].tc+=(m.cal||0);map[k].n++;
    }
  }
  return Object.values(map).filter(m=>m.tp/m.n>=20)
    .map(m=>({desc:m.desc,pro:Math.round(m.tp/m.n),cal:Math.round(m.tc/m.n),n:m.n}))
    .sort((a,b)=>b.pro-a.pro).slice(0,limit);
};

export const getInsights=(data)=>{
  const ins=[];
  const dates=Object.keys(data.nut||{}).sort().reverse().slice(0,30);
  let pH=0,pD=0;
  for(const d of dates){
    const pt=getDayProTarget(d,data.settings||DEFAULTS,data.travelDays,data.socialWeekend);
    const p=data.nut[d]?.totalProtein||0;
    if(p>0){pD++;if(p>=pt)pH++;}
  }
  if(pD>=5){const r=Math.round(pH/pD*100);
    ins.push({type:r>=70?"win":"gap",text:`Protein target hit ${r}% of tracked days (${pH}/${pD})`});}
  const sr=[];
  for(const[d,r] of Object.entries(data.rec||{})){
    if(r.sleepHours&&r.recoveryScore)sr.push({s:r.sleepHours,r:r.recoveryScore});}
  if(sr.length>=7){
    const gs=sr.filter(x=>x.s>=7.5),ps=sr.filter(x=>x.s<7);
    if(gs.length>=3&&ps.length>=3){
      const ga=Math.round(gs.reduce((s,d)=>s+d.r,0)/gs.length);
      const pa=Math.round(ps.reduce((s,d)=>s+d.r,0)/ps.length);
      if(ga-pa>=5)ins.push({type:"insight",text:`7.5h+ sleep averages ${ga}% recovery vs ${pa}% on <7h nights`});
    }
  }
  let cH=0,cD=0;
  for(const d of dates){
    const ct=getDayCalTarget(d,data.settings||DEFAULTS,data.travelDays,data.socialWeekend);
    if(!ct)continue;
    const c=data.nut[d]?.totalCal||0;
    if(c>0){cD++;if(Math.abs(c-ct)<=ct*0.1)cH++;}
  }
  if(cD>=5){const r=Math.round(cH/cD*100);
    ins.push({type:r>=60?"win":"gap",text:`Calories within 10% of target ${r}% of days`});}
  const recWkPairs=Object.entries(data.rec||{}).filter(([d,r])=>r.recoveryScore&&data.wk[d]).map(([d,r])=>{
    const wk=data.wk[d];const progDay=wk.exercises?wk.exercises.filter(ex=>ex.sets&&ex.sets.some(s=>s.done)).length:0;
    return{rec:r.recoveryScore,trained:progDay>0,volume:wk.volume||0};
  });
  if(recWkPairs.length>=3){
    const highRec=recWkPairs.filter(p=>p.rec>=55);
    const lowRec=recWkPairs.filter(p=>p.rec<55);
    const highVol=highRec.length?Math.round(highRec.reduce((s,p)=>s+p.volume,0)/highRec.length):0;
    const lowVol=lowRec.length?Math.round(lowRec.reduce((s,p)=>s+p.volume,0)/lowRec.length):0;
    if(highVol>0&&lowVol>0){
      const pct=Math.round((highVol-lowVol)/lowVol*100);
      ins.push({type:pct>10?"win":"insight",text:`High recovery days (55+): ${highVol.toLocaleString()} lbs avg volume vs ${lowVol.toLocaleString()} lbs on low days (${pct>0?"+":""}${pct}%)`});
    }
  }
  return ins.slice(0,4);
};

export const getCutRetentionScore=(data)=>{
  const planStart=PROG.start;
  const wEntries=Object.entries(data.wt||{}).filter(([d])=>d>=planStart).sort((a,b)=>a[0].localeCompare(b[0]));
  if(wEntries.length<3)return null;
  const mid=Math.floor(wEntries.length/2);
  const firstHalf=wEntries.slice(0,mid),secondHalf=wEntries.slice(mid);
  if(secondHalf.length<1||firstHalf.length<1)return null;
  const rAvg=secondHalf.reduce((s,[_,v])=>s+v,0)/secondHalf.length;
  const oAvg=firstHalf.reduce((s,[_,v])=>s+v,0)/firstHalf.length;
  const weeks=Math.max(1,(new Date(wEntries[wEntries.length-1][0])-new Date(wEntries[0][0]))/6048e5);
  const wkChange=Math.abs(rAvg-oAvg)/weeks;
  const wScore=wkChange<=0.5?100:wkChange<=1?85:wkChange<=1.5?65:wkChange<=2?45:20;
  const progEntries=Object.values(data.prog||{});
  const totalL=progEntries.length;
  const heldL=progEntries.filter(p=>p.lastDate).length;
  const lScore=totalL>0?Math.round(heldL/totalL*100):50;
  const nutDates=Object.keys(data.nut||{}).filter(d=>d>=planStart).sort();
  let pH=0,pDays=0;
  for(const d of nutDates){
    const pt=getDayProTarget(d,data.settings||DEFAULTS,data.travelDays,data.socialWeekend);
    const p=data.nut[d]?.totalProtein||0;
    if(p>0){pDays++;if(p>=pt)pH++;}
  }
  const pScore=pDays>0?Math.round(pH/pDays*100):50;
  const total=Math.round(wScore*0.4+lScore*0.4+pScore*0.2);
  return{score:total,weight:{score:wScore,change:+((rAvg-oAvg)/weeks).toFixed(1)},
    lifts:{score:lScore,held:heldL,total:totalL},protein:{score:pScore,hit:pH,days:pDays}};
};

export const calcEWMA=(values,alpha=0.1)=>{
  if(!values.length)return[];
  const result=[values[0]];
  for(let i=1;i<values.length;i++)result.push(alpha*values[i]+(1-alpha)*result[i-1]);
  return result;
};

export const median=(a)=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);const m=Math.floor(s.length/2);return s.length%2?s[m]:(s[m-1]+s[m])/2;};

// Imputed TDEE: anchor on weight trend, classify each day (full / partial /
// unlogged), impute the gaps, report a range whose width scales with how much
// of the window is imputed vs measured. Calibration (data.tdeeCal) tightens
// the unlogged-day assumptions.
export const calcAdaptiveTDEE=(wt,nut,settings,travelDays,tdeeExclude={},tdeeCal=null)=>{
  const planStart=PROG.start;
  const today=td();
  const cal=tdeeCal&&tdeeCal.answered?tdeeCal:null;
  // Median full dinner per DAY (Cronometer tags each item "Dinner", so sum per date first)
  const dinnerByDay={};
  Object.entries(nut||{}).forEach(([dt,n])=>{(n?.meals||[]).forEach(m=>{if(/dinner/i.test(m?.mealType||"")){const c=Number(m.cal)||0;if(c>0)dinnerByDay[dt]=(dinnerByDay[dt]||0)+c;}});});
  const medDinner=Math.round(median(Object.values(dinnerByDay).filter(v=>v>150))||650);
  const listDays=(a,b)=>{const out=[];const d=new Date(a+"T12:00:00");const end=new Date(b+"T12:00:00");while(d<=end){out.push(lds(d));d.setDate(d.getDate()+1);}return out;};
  const shiftDay=(s,n)=>{const d=new Date(s+"T12:00:00");d.setDate(d.getDate()+n);return lds(d);};

  const estimate=(startD,endD)=>{
    if(endD<startD)return null;
    const nutDates=Object.keys(nut||{}).filter(dt=>dt>=startD&&dt<=endD&&(nut[dt]?.totalCal||0)>0).sort();
    if(nutDates.length<5)return null;
    const days=listDays(nutDates[0],nutDates[nutDates.length-1]).filter(dt=>!tdeeExclude[dt]&&dt<=today);
    const fullCals=[];const classified=[];
    for(const dt of days){
      const target=getDayCalTarget(dt,settings,travelDays,null)||1800;
      const t=nut[dt]?.totalCal||0;
      if(t>=Math.max(800,target*0.6)){classified.push({dt,cls:"full",t});fullCals.push(t);}
      else if(t>0)classified.push({dt,cls:"partial",t});
      else classified.push({dt,cls:"unlogged",t:0});
    }
    if(fullCals.length<5)return null;
    const medFull=median(fullCals);
    const vals=classified.map(({dt,cls,t})=>{
      if(cls==="full")return t;
      if(cls==="partial")return t+medDinner;
      const wd=new Date(dt+"T12:00:00").getDay();
      if(cal&&(cal.unloggedIs==="blowup"||(cal.unloggedIs==="mixed"&&(wd===5||wd===6))))return cal.socialCal||3000;
      if(cal&&cal.fastSlips&&wd===3)return settings?.trainingCal||1800;
      return medFull;
    });
    const nFull=fullCals.length,nPart=classified.filter(c=>c.cls==="partial").length,nUn=classified.length-nFull-nPart;
    const imputedShare=classified.length?(nPart*0.5+nUn)/classified.length:0;
    const avgCal=Math.round(vals.reduce((s,v)=>s+v,0)/vals.length);
    const wDates=Object.keys(wt||{}).filter(dt=>dt>=days[0]&&dt<=days[days.length-1]&&wt[dt]!=null).sort();
    if(wDates.length<3)return null;
    const weights=wDates.map(dt=>wt[dt]);
    const trendW=calcEWMA(weights,0.3);
    // Same slope engine as getTrend: EWMA endpoints lag a steady loss by ~9 days
    // at alpha 0.1 and under-read the rate, which under-estimates TDEE.
    const weeklyChange=slopePerWeek(wDates.map(dt=>[dt,wt[dt]]));
    const tdeeRaw=Math.round(avgCal-(weeklyChange*3500/7));
    const tdee=Math.max(Math.round(avgCal*0.5),Math.min(Math.round(avgCal*1.5),tdeeRaw));
    return{tdee,avgCalories:avgCal,weeklyChange,imputedShare,nFull,nPart,nUn,
      trendWeight:+trendW[trendW.length-1].toFixed(1),
      trendWeights:wDates.map((dt,i)=>({d:dt,v:+trendW[i].toFixed(1),raw:weights[i]}))};
  };

  const cur=estimate(planStart,today);
  const hist=estimate("2000-01-01",shiftDay(planStart,-1));
  if(!cur&&!hist)return{daysUsed:0,historyDays:0,daysNeeded:7,phase:"collecting"};

  let source="current",base=cur,historyWeight=0;
  const curFull=cur?cur.nFull:0,histFull=hist?hist.nFull:0;
  if(hist&&(!cur||curFull<7)){
    source="history";base=hist;historyWeight=1;
  }else if(hist&&cur){
    const currentWeight=Math.min(1,curFull/21);
    historyWeight=1-currentWeight;
    source=historyWeight>0.15?"blended":"current";
    base={...cur,tdee:Math.round(hist.tdee*historyWeight+cur.tdee*currentWeight)};
  }

  const imputedShare=base.imputedShare??0;
  const half=Math.round(120+imputedShare*430);
  const confidence=Math.min(95,Math.round(((curFull*5)+(histFull?Math.min(35,histFull*1.5):0))*(1-0.35*imputedShare)));
  const calT=getDayCalTarget(today,settings,travelDays,null);
  const deficit=base.tdee-calT;
  return{tdee:base.tdee,tdeeLow:base.tdee-half,tdeeHigh:base.tdee+half,imputedShare:+imputedShare.toFixed(2),calibrated:!!cal,
    confidence,avgCalories:base.avgCalories,weeklyChange:+base.weeklyChange.toFixed(2),
    daysUsed:curFull,historyDays:histFull,historyTDEE:hist?.tdee,historyWeight:+historyWeight.toFixed(2),source,
    phase:curFull<7?(hist?"seeded":"collecting"):confidence<60?"early":"confident",
    deficit,trendWeight:base.trendWeight,trendWeights:(cur||hist).trendWeights};
};

export const getDailyCutAdherence=(data,date,settings=data.settings||DEFAULTS)=>{
  const nut=data.nut?.[date]||{};
  const calT=getDayCalTarget(date,settings,data.travelDays,data.socialWeekend);
  const proT=getDayProTarget(date,settings,data.travelDays,data.socialWeekend);
  const cal=nut.totalCal||0,pro=nut.totalProtein||0;
  const logged=cal>0||pro>0||(nut.meals||[]).length>0;
  return{date,logged,calTarget:calT,proteinTarget:proT,calories:cal,protein:pro,
    calorieHit:calT===null?logged:(logged&&Math.abs(cal-calT)<=calT*0.12),
    proteinHit:logged&&pro>=proT*0.9,
    weightLogged:data.wt?.[date]!=null,
    workoutDone:!!data.wk?.[date],
    cardioDone:!!data.cardio?.[date]?.done};
};

export const getWeeklyCutSummary=(data,today=td())=>{
  const settings=data.settings||DEFAULTS;
  const dates=[];for(let i=6;i>=0;i--){const d=new Date(today+"T12:00:00");d.setDate(d.getDate()-i);dates.push(lds(d));}
  const adherence=dates.map(d=>getDailyCutAdherence(data,d,settings));
  const loggedDays=adherence.filter(a=>a.logged).length;
  const proteinHits=adherence.filter(a=>a.proteinHit).length;
  const calorieHits=adherence.filter(a=>a.calorieHit).length;
  const weightDays=adherence.filter(a=>a.weightLogged).length;
  const plannedTraining=dates.filter(d=>!!data.program?.[dw(d)]);
  const trainingDone=plannedTraining.filter(d=>!!data.wk?.[d]).length;
  const cardioDone=adherence.filter(a=>a.cardioDone).length;
  const trend=getTrend(data.wt,today);
  const weightTrend=trend===null
    ?{label:"Missing",status:"unknown",weeklyChange:null,days:0}
    :{label:trend.rate<-1.5?"Dropping fast":trend.rate<-0.25?"Dropping":trend.rate<=0.25?"Flat":"Up",
      status:trend.rate<-1.5?"fast":trend.rate<-0.25?"onPace":trend.rate<=0.25?"flat":"up",
      weeklyChange:trend.rate,days:trend.n};
  const recValues=dates.map(d=>data.rec?.[d]?.recoveryScore).filter(v=>v!=null);
  const recoveryAvg=recValues.length>=3?Math.round(recValues.reduce((s,v)=>s+v,0)/recValues.length):getWeeklyRecoveryAvg(data.rec||{});
  const tdee=calcAdaptiveTDEE(data.wt||{},data.nut||{},settings,data.travelDays,data.tdeeExclude||{},data.tdeeCal);
  return{dates,adherence,loggedDays,proteinHits,calorieHits,weightDays,
    nutritionAdherence:loggedDays?Math.round(((proteinHits+calorieHits)/(loggedDays*2))*100):0,
    proteinRate:loggedDays?Math.round(proteinHits/loggedDays*100):0,
    calorieRate:loggedDays?Math.round(calorieHits/loggedDays*100):0,
    weightTrend,recoveryAvg,recoveryDays:recValues.length,trainingDone,plannedTraining:plannedTraining.length,
    cardioDone,tdee,stalls:getStalls(data.prog||{},data.wk||{},data.program||PROG.days)};
};

export const getWeeklyConsistency=(data,today=td(),pre=null)=>{
  const dates=[];for(let i=6;i>=0;i--){const d=new Date(today+"T12:00:00");d.setDate(d.getDate()-i);dates.push(lds(d));}
  const cut=pre||getWeeklyCutSummary(data,today);
  const days=dates.map(d=>{
    const liftPlanned=!!data.program?.[dw(d)];
    const liftDone=!!data.wk?.[d];
    const cardio=data.cardio?.[d];
    const cardioDone=!!cardio?.done;
    const cardioMinutes=Math.round(Number(cardio?.duration||0));
    const weightLogged=data.wt?.[d]!=null;
    return{date:d,label:["S","M","T","W","T","F","S"][new Date(d+"T12:00:00").getDay()],weightLogged,liftPlanned,liftDone,cardioDone,cardioMinutes};
  });
  const liftsPlanned=days.filter(d=>d.liftPlanned).length;
  const liftsDone=days.filter(d=>d.liftDone).length;
  const cardioSessions=days.filter(d=>d.cardioDone).length;
  const cardioMinutes=days.reduce((s,d)=>s+d.cardioMinutes,0);
  const weightDays=days.filter(d=>d.weightLogged).length;
  const winDays=days.filter(d=>d.weightLogged||d.liftDone||d.cardioDone).length;
  const trend=cut.weightTrend.weeklyChange==null?"Need 2+ weigh-ins":`${cut.weightTrend.weeklyChange>0?"+":""}${cut.weightTrend.weeklyChange} lb/wk`;
  const tone=liftsPlanned&&liftsDone>=liftsPlanned&&cardioSessions>=2&&weightDays>=5?"great":winDays>=5?"good":winDays>=3?"building":"start";
  const message=tone==="great"?"Week is on rails":tone==="good"?"Wins are stacking":tone==="building"?"Keep collecting wins":"One win starts the week";
  return{days,liftsDone,liftsPlanned,cardioSessions,cardioMinutes,weightDays,winDays,trend,tone,message};
};

export const getTonightCloseout=(data,date=td())=>{
  const settings=data.settings||DEFAULTS;
  const a=getDailyCutAdherence(data,date,settings);
  const steps=data.steps?.[date]||0;
  const stepsTarget=cutStepsTarget(settings);
  const rec=data.rec?.[date]?.recoveryScore??null;
  const cardioDone=!!data.cardio?.[date]?.done;
  const workoutDone=!!data.wk?.[date];
  const sess=data.program?.[dw(date)]||null;
  const tomorrow=new Date(date+"T12:00:00");tomorrow.setDate(tomorrow.getDate()+1);
  const tomorrowStr=lds(tomorrow);
  const tomorrowType=getDayType(tomorrowStr,data.travelDays||{});
  const proteinLeft=Math.max(0,(a.proteinTarget||0)-(a.protein||0));
  const caloriesLeft=a.calTarget===null?null:(a.calTarget||0)-(a.calories||0);
  const foodOk=a.logged&&a.proteinHit&&(a.calTarget===null||a.calorieHit);
  const stepsOk=steps>=stepsTarget;
  const liftOk=!sess||workoutDone;
  const recoveryRisk=rec!=null&&rec<55;
  let tomorrowMode="Normal cut day";
  let action="Close habits, then stop adding friction.";
  let tone="good";
  if(!a.logged){tomorrowMode="Data-first morning";action="Log food before changing any target.";tone="warn";}
  else if(proteinLeft>25){tomorrowMode="Protein-first day";action=`Get ${proteinLeft}g protein before bed or make tomorrow protein-first.`;tone="warn";}
  else if(caloriesLeft!=null&&caloriesLeft<-150){tomorrowMode="Tighten food";action="No target change. Keep tomorrow cleaner and hit protein early.";tone="warn";}
  else if(recoveryRisk){tomorrowMode="Recovery-biased";action="Reduce cardio/stress before cutting food. Protect lifting.";tone="bad";}
  else if(!cardioDone){tomorrowMode="Cardio catch-up";action="Do planned Zone 2 tomorrow; don't cut calories to compensate.";tone="warn";}
  else if(!stepsOk){tomorrowMode="Steps bias";action=`Finish steps if practical; otherwise make tomorrow a ${Math.round(stepsTarget/1000)}k step day.`;tone="warn";}
  else if(!liftOk){tomorrowMode="Training priority";action="Lift is the priority before adding extra cardio.";tone="warn";}
  return{tomorrow:tomorrowStr,tomorrowMode,action,tone,foodOk,proteinLeft,caloriesLeft,steps,stepsTarget,stepsOk,cardioDone,liftOk,habitsLogged:!!data.habits?.[date],recovery:rec};
};

export const getWeeklyCutRecommendation=(data,today=td(),pre=null)=>{
  const s=pre||getWeeklyCutSummary(data,today);
  const deload=wkn(today)===PROG.deload;
  const adherencePoor=s.loggedDays<4||s.weightDays<3||s.nutritionAdherence<60;
  const lowRecovery=s.recoveryAvg!=null&&s.recoveryAvg<55;
  const veryLowRecovery=s.recoveryAvg!=null&&s.recoveryAvg<45;
  const stalls=s.stalls.length;
  let rec;
  if(deload){
    rec={key:"deload",action:"Run this as a recovery-biased deload week.",why:"Program cycle says deload, so completion, sleep, mobility, and easy Zone 2 matter more than forcing more deficit.",confidence:s.loggedDays>=3||s.recoveryDays>=3?"Medium":"Low"};
  }else if(adherencePoor){
    rec={key:"adherence",action:"Tighten logging and hit protein before changing targets.",why:`Only ${s.loggedDays}/7 days have nutrition logs and ${s.weightDays}/7 have weigh-ins. The app needs better inputs before recommending calorie/cardio changes.`,confidence:s.loggedDays>=3||s.weightDays>=3?"Medium":"Low"};
  }else if(veryLowRecovery){
    rec={key:"recover",action:"Reduce cardio/stress first; keep food targets steady.",why:`Weekly recovery is ${s.recoveryAvg}%. Protect lifting and sleep before cutting calories further.`,confidence:s.recoveryDays>=3?"High":"Medium"};
  }else if(lowRecovery&&s.weightTrend.status!=="flat"){
    rec={key:"stress",action:"Keep calories steady and make cardio easier this week.",why:`Weight is ${s.weightTrend.label.toLowerCase()} while recovery averages ${s.recoveryAvg}%, so the safer lever is stress/cardio, not less food.`,confidence:s.recoveryDays>=3&&s.weightTrend.days>=4?"High":"Medium"};
  }else if(s.weightTrend.status==="fast"){
    rec={key:"too-fast",action:"Stay fed around training; do not add more deficit.",why:`Trend is about ${Math.abs(s.weightTrend.weeklyChange).toFixed(1)} lb/week down. That is fast enough to threaten recovery/performance on a cut.`,confidence:s.weightTrend.days>=4?"Medium":"Low"};
  }else if(s.weightTrend.status==="flat"||s.weightTrend.status==="up"){
    rec={key:"adjust",action:"Adjust one lever only: add 10–15 min Zone 2 twice this week or trim ~100 calories on rest days.",why:`Adherence is ${s.nutritionAdherence}% and weight is ${s.weightTrend.label.toLowerCase()}, so one small lever is enough. Targets stay unchanged until you choose it.`,confidence:s.weightTrend.days>=4&&s.tdee.phase!=="collecting"?"High":"Medium"};
  }else if(stalls>=2){
    rec={key:"training",action:"Hold the deficit steady and prioritize sleep/carbs around lifting.",why:`${stalls} lifts are showing stalls/drops. Preserve training output before making the cut more aggressive.`,confidence:"Medium"};
  }else{
    rec={key:"stay",action:"Stay the course this week.",why:`Weight trend, nutrition adherence (${s.nutritionAdherence}%), and recovery are good enough. Do not change multiple levers.`,confidence:s.weightTrend.days>=4&&s.loggedDays>=5?"High":"Medium"};
  }
  return{...rec,summary:s,signals:[
    {label:"Weight",value:s.weightTrend.weeklyChange==null?s.weightTrend.label:`${s.weightTrend.weeklyChange>0?"+":""}${s.weightTrend.weeklyChange} lb/wk`,tone:s.weightTrend.status==="onPace"?"good":s.weightTrend.status==="fast"||s.weightTrend.status==="flat"||s.weightTrend.status==="up"?"warn":"muted"},
    {label:"Nutrition adherence",value:s.loggedDays===0?"—":`${s.nutritionAdherence}%`,tone:s.loggedDays===0?"muted":s.nutritionAdherence>=70?"good":s.nutritionAdherence>=60?"warn":"bad"},
    {label:"Recovery",value:s.recoveryAvg==null?"Missing":`${s.recoveryAvg}%`,tone:s.recoveryAvg==null?"muted":s.recoveryAvg>=65?"good":s.recoveryAvg>=55?"warn":"bad"},
    {label:"Training",value:s.plannedTraining?`${s.trainingDone}/${s.plannedTraining}`:"Rest",tone:s.plannedTraining&&s.trainingDone<s.plannedTraining?"warn":"good"},
    {label:"Cardio",value:`${s.cardioDone}/7`,tone:s.cardioDone>=2?"good":s.cardioDone>=1?"warn":"muted"}
  ]};
};

// ═══ PLATES ═══
export const BARBELL_IDS=new Set(["flat-bench","deadlift","rdl","back-squat","front-squat","sldl"]);
export const PLATES=[45,35,25,10,5,2.5];
export const plateMath=(total,bar=45)=>{let side=(Number(total)-bar)/2;if(!(side>=0))return null;const out=[];for(const p of PLATES){while(side>=p-1e-9){out.push(p);side-=p;}}return{perSide:out,leftover:+side.toFixed(1)};};

export const resolveMode=(data,t,workout,hm,dayName=dw(t))=>{
  const weightLogged=data.wt?.[t]!=null;
  const isTraining=!!data.program?.[dayName];
  const liftDone=!!data.wk?.[t];
  if(workout)return"session";                                   // active workout always wins
  if(hm>=4.5&&hm<9&&!weightLogged)return"morning";
  if(isTraining&&!liftDone&&hm<13&&hm>=4.5)return"session";
  if(hm>=19.5)return"closeout";
  return"neutral";
};

// Rule-based auto-regulation from Oura recovery · no AI call. Accept mutates
// TODAY'S session plan only (applied at startW), never the stored program.
export const getAutoregProposal=(rec)=>{
  const score=rec?.recoveryScore;
  if(score==null||score>=60)return null;
  const proposals=[{id:"minusOneSet",label:"−1 set on non-anchor accessories today"}];
  if(score<40)proposals.push({id:"mobilitySwap",label:"Swap to mobility session"});
  return{score,proposals};
};


// ═══ WORKOUT ENGINE · pure versions of what the Train deck does ═══
// Weight resolution: progression by lift + rep range, then history by progKey,
// then history by id within the rep range, then a legacy plain-id row (only for
// unambiguous lifts), then the program default. Every step is sanity-capped.
export const resolveWeight=(data,exOrId,def,slot=null)=>{
  const ex=typeof exOrId==="string"?{id:exOrId,sw:def,rr:slot?.rr}:exOrId;
  const key=progKey(ex,slot||ex);
  const p=data.prog?.[key]?.currentWeight;
  if(p!=null&&saneWeight(ex,p))return p;
  const dates=Object.keys(data.wk||{}).sort().reverse();
  for(const d of dates){
    const wex=data.wk[d].exercises?.find(e=>e.progKey===key);
    if(wex){const next=nextWeightFromSets(wex.sets,slot||ex);if(next!=null&&saneWeight(ex,next))return next;}
  }
  const targetRr=(slot?.rr||ex.rr);
  for(const d of dates){
    const wex=data.wk[d].exercises?.find(e=>e.id===ex.id);
    if(wex){const ds=wex.sets?.filter(s=>saneSet(s)&&(!targetRr||Number(s.reps)>=targetRr[0]&&Number(s.reps)<=targetRr[1]));
      if(ds?.length&&saneWeight(ex,ds[0].weight)){const inc=slot?.inc??ex.inc;const hitTop=targetRr&&inc>0&&ds.length>=((slot||ex).sets||1)&&ds.every(s=>Number(s.reps)>=targetRr[1]);return hitTop?Number(ds[0].weight)+inc:ds[0].weight;}}
  }
  if(!legacyAmbiguousIds.has(ex.id)){
    const lp=data.prog?.[ex.id];
    if((lp?.lastReps||[]).some(r=>Number(r)>0)&&lp?.currentWeight!=null&&saneWeight(ex,lp.currentWeight))return lp.currentWeight;
  }
  return def;
};

// Last session's completed sets for a lift (progKey first, then id) · feeds prefill.
export const lastSessionSets=(data,key,id)=>{
  const dates=Object.keys(data.wk||{}).sort().reverse();
  for(const dt of dates){
    const wex=data.wk[dt]?.exercises?.find(e=>(key&&e.progKey===key)||(id&&e.id===id));
    if(wex?.sets?.some(saneSet))return wex.sets.filter(saneSet);
  }
  return null;
};

// Plan-safe substitutions: same or related movement pattern, not already in the
// session, best fit first (same pattern > same region > has history).
export const swapOptions=(data,workout,slotEx,currentEx)=>{
  const base=exLibById[currentEx.id]||exLibById[slotEx.id]||slotEx;
  const pats=relatedPatterns[base.pattern]||[base.pattern].filter(Boolean);
  const used=new Set((workout?.exercises||[]).map(e=>e.id));
  return EXERCISE_LIBRARY
    .filter(opt=>opt.id!==currentEx.id&&pats.includes(opt.pattern)&&!used.has(opt.id))
    .map(opt=>{
      const key=progKey(opt,slotEx);
      const hasHistory=data.prog?.[key]?.currentWeight!=null||data.prog?.[opt.id]?.currentWeight!=null||Object.values(data.wk||{}).some(w=>w.exercises?.some(e=>e.progKey===key||e.id===opt.id));
      const score=(opt.pattern===base.pattern?40:20)+(opt.region===base.region?10:0)+(hasHistory?8:0);
      return {...opt,sets:slotEx.sets,rr:slotEx.rr,rest:slotEx.rest,notes:slotEx.notes,progKey:key,recommended:score>=48,score};
    })
    .sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
};

const deloadWeight=w=>Math.round(w*0.5/5)*5;
const prefillSets=(count,wt,last,topReps)=>Array.from({length:count},(_,si)=>({weight:wt,
  reps:Number(last?.[si]?.reps)>0?Number(last[si].reps):(topReps||0),
  rir:last?.[si]?.rir??"",prefilled:true,done:false}));

// Build one exercise entry for a live session from a plan slot.
export const buildExerciseEntry=(data,slot,{isDeload=false,withWarmup=true,extra={}}={})=>{
  const key=progKey(slot,slot);
  const cw=resolveWeight(data,{...slot,progKey:key},slot.sw,slot);
  const wt=isDeload?deloadWeight(cw):cw;
  const last=lastSessionSets(data,key,slot.id);
  return{id:slot.id,progKey:key,...extra,
    wu:withWarmup?WU(wt).map(w=>({...w,done:false})):[],
    sets:prefillSets(slot.sets,wt,last,slot.rr?.[1])};
};

// Start-of-session plan. Accepted auto-regulation (−1 set on non-anchor
// accessories) mutates today's plan only; the stored program is never touched.
export const buildSession=(data,day,sess,{date=td(),variant=null,now=Date.now()}={})=>{
  if(!sess)return null;
  const isDeload=wkn(date)===PROG.deload;
  const autoregToday=data.autoregLog?.[date]?.type==="minusOneSet";
  return{day,variant,isDeload,start:now,exercises:sess.exercises.map(ex=>{
    const effSets=autoregToday&&!ex.anchor?Math.max(1,ex.sets-1):ex.sets;
    return buildExerciseEntry(data,{...ex,sets:effSets},{isDeload});
  })};
};

// Manual-session slot from a library exercise: 3×8-12, 90 s rest.
export const manualSlot=(opt)=>({id:opt.id,name:opt.name,sets:3,rr:[8,12],rest:90,sw:opt.sw,inc:opt.inc,unit:opt.unit,cue:opt.cue,pattern:opt.pattern,region:opt.region});

// Superset groups: rest:0 chains an exercise to the next (1A → 1B); sets inside a
// group interleave round-robin. Returns index groups and the current (ei,si).
export const sessionCursor=(exs,restOf)=>{
  const groups=[];for(let i=0;i<exs.length;){const grp=[i];while(restOf(grp[grp.length-1])===0&&i+1<exs.length){i++;grp.push(i);}i++;groups.push(grp);}
  let curEi=-1,curSi=-1;
  for(const grp of groups){
    if(curEi>=0)break;
    const maxSets=Math.max(...grp.map(m=>exs[m].sets.length));
    for(let si=0;si<maxSets&&curEi<0;si++)for(const m of grp){const st=exs[m].sets[si];if(st&&!st.done){curEi=m;curSi=si;break;}}
  }
  return{groups,curEi,curSi};
};

// Finish: write the log, advance progression per the cut rules (anchors
// progress on a full top-of-range session, accessories hold and take rep PRs,
// deload never moves weight), refresh e1RM history and PRs. Pure: returns the
// new data object plus what changed, so the caller decides what to persist.
export const applyWorkout=(data,workout,sess,date=td(),now=Date.now())=>{
  const nd={...data,prog:{...(data.prog||{})},wk:{...(data.wk||{})}};
  const prs=[];const touched=[];
  const dur=Math.round((now-workout.start)/6e4);
  nd.wk[date]={day:workout.day,variant:workout.variant||null,manual:workout.manual||false,exercises:workout.exercises,dur};
  workout.exercises.forEach((ex,i)=>{
    const pe=sess?.exercises?.[i]||ex.slot;if(!pe)return;
    const active=ex.swappedTo?{...ex.swappedTo,sets:pe.sets,rr:pe.rr,rest:pe.rest}:pe;
    const aid=ex.progKey||progKey(active,pe);
    const ainc=active.inc??pe.inc;
    const aname=active.name||pe.name;
    const asw=active.sw??pe.sw;
    const cs=ex.sets.filter(saneSet);
    if(!cs.length)return;
    const hit=cs.length===pe.sets&&cs.every(s=>Number(s.reps)>=pe.rr[1]);
    const cw=cs[0].weight>0?cs[0].weight:resolveWeight(data,active,asw,pe);
    const prev=nd.prog[aid]||{};
    const prevPr=prev.pr;const prevHistory=prev.e1rmHistory||[];
    const prevWeight=prev.currentWeight||resolveWeight(data,active,asw,pe);
    const isAnchor=!!(pe.anchor||active.anchor);
    const shouldProgress=(isAnchor||!CUT_HOLD_PROGRESSION)&&!workout.isDeload&&hit&&ainc>0;
    const newWeight=workout.isDeload?prevWeight:(shouldProgress?cw+ainc:cw);
    const entry={currentWeight:newWeight,lastReps:cs.map(s=>s.reps),lastDate:date,progressed:shouldProgress,pr:prevPr||null,e1rmHistory:prevHistory,exerciseId:active.id,repRange:pe.rr,name:aname};
    if(!workout.isDeload){
      const bestSet=cs.reduce((best,s)=>e1rm(s.weight||0,s.reps)>e1rm(best.weight||0,best.reps)?s:best,cs[0]);
      const newE1rm=e1rm(bestSet.weight||0,bestSet.reps);
      if(newE1rm>0){
        entry.e1rmHistory=[...prevHistory,{date,e1rm:newE1rm}].slice(-12);
        if(!prevPr||newE1rm>prevPr.e1rm){entry.pr={name:aname,weight:bestSet.weight,reps:bestSet.reps,e1rm:newE1rm,date};if(prevPr)prs.push({name:aname,weight:bestSet.weight,reps:bestSet.reps,e1rm:newE1rm,prev:prevPr.e1rm});}
      }
    }
    nd.prog[aid]=entry;touched.push(aid);
  });
  nd.wk[date].volume=calcVolume(workout.exercises);
  return{data:nd,prs,touched,log:nd.wk[date]};
};

// ═══ PROGRAM UPDATES · the Coach's write path ═══
// Pure: apply a list of changes to {settings, program}. Used server-side by
// /api/mcp and /api/update, and by tests. Returns new objects + descriptions.
export const SETTINGS_FIELDS=["calories","protein","water","steps","sleep","fiber","trainingCal","wednesdayCal","weekendCal"];
export const applyChanges=(changes,{settings={},program={}}={})=>{
  const s={...settings};const p=JSON.parse(JSON.stringify(program||{}));
  const applied=[];const rejected=[];const results=[];
  const ok=(msg)=>{applied.push(msg);results.push({ok:true,summary:msg});};
  const no=(c,error)=>{rejected.push({change:c,error});results.push({ok:false,error});};
  for(const c of changes||[]){
    if(!c||typeof c!=="object"){no(c,"empty change");continue;}
    if(c.type==="settings"){
      if(!SETTINGS_FIELDS.includes(c.field)){no(c,`unknown settings field ${c.field}`);continue;}
      const v=Number(c.value);if(!Number.isFinite(v)||v<0){no(c,"value must be a non-negative number");continue;}
      const old=s[c.field];s[c.field]=v;ok(`${c.field}: ${old??"unset"} → ${v}`);
    }else if(c.type==="exercise"){
      const findDay=(id)=>Object.entries(p).find(([,d])=>(d.exercises||[]).some(e=>e.id===id));
      if(c.action==="update"&&c.exerciseId&&c.fields){
        const hit=findDay(c.exerciseId);if(!hit){no(c,`no exercise ${c.exerciseId} in program`);continue;}
        const ex=hit[1].exercises.find(e=>e.id===c.exerciseId);Object.assign(ex,c.fields);ok(`Updated ${ex.name}: ${Object.keys(c.fields).join(", ")}`);
      }else if(c.action==="swap"&&c.oldExerciseId&&c.newExercise?.id){
        const hit=findDay(c.oldExerciseId);if(!hit){no(c,`no exercise ${c.oldExerciseId} in program`);continue;}
        const idx=hit[1].exercises.findIndex(e=>e.id===c.oldExerciseId);const old=hit[1].exercises[idx];
        hit[1].exercises[idx]={...c.newExercise,anchor:c.newExercise.anchor??old.anchor};ok(`Swapped ${old.name} → ${c.newExercise.name} (${hit[0]})`);
      }else if(c.action==="add"&&c.day&&c.exercise?.id){
        if(!p[c.day]){no(c,`no training day ${c.day}`);continue;}
        if((p[c.day].exercises||[]).some(e=>e.id===c.exercise.id)){no(c,`${c.exercise.id} already on ${c.day}`);continue;}
        p[c.day].exercises=[...(p[c.day].exercises||[]),c.exercise];ok(`Added ${c.exercise.name} to ${c.day}`);
      }else if(c.action==="remove"&&c.day&&c.exerciseId){
        const day=p[c.day];const idx=(day?.exercises||[]).findIndex(e=>e.id===c.exerciseId);
        if(idx<0){no(c,`no ${c.exerciseId} on ${c.day}`);continue;}
        const [gone]=day.exercises.splice(idx,1);ok(`Removed ${gone.name} from ${c.day}`);
      }else no(c,`unsupported exercise action ${c.action}`);
    }else no(c,`unknown change type ${c.type}`);
  }
  return{settings:s,program:p,applied,rejected,results};
};

// Exercise view for coaching: sessions, e1RM line, PR, working weight, swaps.
export const exerciseReport=(data,ex,progKeyStr)=>{
  const sessions=Object.entries(data.wk||{}).sort((a,b)=>b[0].localeCompare(a[0])).map(([d,w])=>{
    const wex=w.exercises?.find(e=>(progKeyStr&&e.progKey===progKeyStr)||e.id===ex.id);if(!wex)return null;
    const cs=(wex.sets||[]).filter(saneSet);if(!cs.length)return null;
    const best=cs.reduce((b,x)=>e1rm(Number(x.weight)||0,x.reps)>e1rm(Number(b.weight)||0,b.reps)?x:b,cs[0]);
    return{date:d,sets:cs.map(x=>({weight:Number(x.weight)||0,reps:Number(x.reps)||0,rir:x.rir??null})),e1rm:e1rm(Number(best.weight)||0,best.reps),volume:cs.reduce((t,x)=>t+(Number(x.weight)||0)*x.reps,0)};
  }).filter(Boolean);
  return{id:ex.id,name:ex.name,progKey:progKeyStr,pr:getProgPr(data.prog||{},{...ex,progKey:progKeyStr}),
    workingWeight:resolveWeight(data,{...ex,progKey:progKeyStr},ex.sw,ex),sessions};
};
