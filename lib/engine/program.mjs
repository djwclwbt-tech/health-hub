// ═══ ENGINE · PROGRAM ═══ Data only: the training block (PROG, versioned), warm-ups,
// exercise library, supersets, stretch poses, dinners, cardio presets, DEFAULTS, plates.
// ═══ PROGRAM ═══
export const PROG = {
  // version: bump whenever PROG.days changes in code. A stored program row (coach
  // edits) is kept only while its version matches; a new version resets it.
  // Block dates drive week numbers, the TDEE "current" window and the trajectory card.
  // PF Austin is an injury comeback: no fixed deload week (deload:null); low recovery
  // already trims sets through auto-regulation.
  name:"PF Austin Cut",version:"pf-austin-wk1.2026-10-05",weeks:8,deload:null,start:"2026-10-05",end:"2026-11-29",
  checkpoint:{week:4,date:"2026-11-01"},startWeight:186,targetWeight:175,
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
        {id:"machine-chest-press",name:"Machine Chest Press",sets:3,rr:[5,8],rest:150,sw:135,inc:5,unit:"lbs",anchor:true,notes:"Anchor · neutral handles while the right wrist settles · +5 when all sets hit 8",cue:"Handles at mid-chest, wrists stacked straight. Press without shrugging and feel your chest, not your shoulders"},
        {id:"seated-row",name:"Seated Row Machine",sets:2,rr:[5,8],rest:120,sw:160,inc:5,unit:"lbs",notes:"Vertical (neutral) grip, 1s squeeze",cue:"Hands are hooks. Pull with your elbows and feel the middle of your back do the work, hold the squeeze one second"},
        {id:"machine-shoulder-press",name:"Machine Shoulder Press",sets:2,rr:[5,8],rest:120,sw:95,inc:5,unit:"lbs",notes:"Neutral handles",cue:"Seat so the handles start at chin height. Ribs down, press straight up and feel your shoulders carry it"},
        {id:"pull-ups",name:"Pull-ups",sets:3,rr:[5,8],rest:150,sw:0,inc:0,unit:"BW",notes:"Rack or power-tower bar · assisted machine if reps drop under 5",cue:"Full hang, drive your elbows down into your back pockets, chest tall, no swinging"},
        {id:"pec-deck",name:"Pec Deck",sets:2,rr:[12,15],rest:60,sw:90,inc:5,unit:"lbs",notes:"Finisher, RIR 2",cue:"Soft elbows, bring the pads together with your chest. Slow on the way back and feel the stretch"},
      ]},
    tuesday:{name:"Lower A · Strength",focus:"Strength",reps:"5-8",
      warmup:{cardio:"5 min bike (easy pace)",moves:[
        {name:"Dead Bugs",rx:"10 per side, slow and controlled"},
        {name:"Half-Kneeling Psoas Stretch",rx:"30s per side, extra round on left"},
        {name:"QL Side Stretch",rx:"20s per side"},
      ],ramp:"1-2 ramp-up sets on your first exercise"},
      exercises:[
        {id:"leg-press",name:"Leg Press (45° plate)",sets:2,rr:[5,8],rest:120,sw:330,inc:10,anchor:true,unit:"lbs",notes:"Anchor · comeback weight after 2.5 months off legs (last 410-420×8, Jul 21)",cue:"All the way down, drive through your whole foot. Feel your thighs load at the bottom"},
        {id:"glute-press",name:"Glute Press",sets:2,rr:[10,12],rest:90,sw:50,inc:5,unit:"lbs",notes:"New lift · start light and find the weight on set 1",cue:"Hips square, ribs down. Drive through your heel and squeeze the glute at the top without arching your low back"},
        {id:"lying-leg-curl",name:"Lying Leg Curl",sets:2,rr:[5,8],rest:90,sw:130,inc:5,unit:"lbs",notes:"3s eccentric · comeback weight (last 170 for 6,7, Jul 21)",cue:"Pull your heels to your butt and squeeze the back of your thighs. Lower slow, three counts"},
        {id:"seated-calf",name:"Seated Calf Raise",sets:2,rr:[10,12],rest:60,sw:90,inc:5,unit:"lbs",notes:"Gym has no standing calf machine",cue:"Targets soleus, full stretch at bottom, slow 2s up"},
      ]},
    wednesday:{name:"Mobility + Arms",focus:"Core",reps:"10-15",
      warmup:{cardio:"5 min bike",note:"Mobility block first, then arms.",moves:[]},
      exercises:[
        {id:"incline-db-curl",name:"Incline DB Curl",sets:2,rr:[10,12],rest:0,sw:15,inc:2.5,unit:"lbs",notes:"Superset 1A · then OH rope extension",cue:"Let your arms hang all the way back and feel the biceps stretch. Curl without swinging"},
        {id:"oh-tricep-ext",name:"Overhead Tricep Extension",sets:2,rr:[10,12],rest:60,sw:40,inc:5,unit:"lbs",notes:"Superset 1B · rest 60s after this",cue:"Elbows tight by your head. Feel the back of your arms stretch deep, then squeeze to lock out"},
        {id:"cable-hammer-curl",name:"Cable Hammer Curl (Rope)",sets:2,rr:[10,12],rest:0,sw:30,inc:5,unit:"lbs",notes:"Superset 2A · then tricep pushdown",cue:"Thumbs up, elbows pinned to your sides. Squeeze at the top and feel the outside of your arms"},
        {id:"tricep-pushdown",name:"Tricep Pushdown",sets:2,rr:[10,12],rest:60,sw:50,inc:5,unit:"lbs",notes:"Superset 2B · rest 60s after this",cue:"Pin your elbows to your ribs. Squeeze the back of your arms hard at the bottom, let it up slow"},
        {id:"machine-biceps-curl",name:"Seated Biceps Curl Machine",sets:2,rr:[12,15],rest:0,sw:40,inc:5,unit:"lbs",notes:"Superset 3A · then triceps machine · replaces reverse/wrist curl while the right wrist settles",cue:"Elbows pinned to the pad, wrists neutral. Full stretch at the bottom, squeeze at the top"},
        {id:"machine-tricep-ext",name:"Seated Triceps Extension Machine",sets:2,rr:[12,15],rest:60,sw:50,inc:5,unit:"lbs",notes:"Superset 3B · rest 60s after this",cue:"Elbows on the pad, press to full lockout and squeeze the back of your arms"},
      ]},
    thursday:{name:"Upper B · Hypertrophy",focus:"Hypertrophy",reps:"10-12",
      warmup:{cardio:"5 min bike",moves:[
        {name:"Band Pull-Aparts",rx:"15 reps"},
        {name:"Shoulder Halos (light KB/plate, 10-15 lbs)",rx:"8 per direction"},
      ],ramp:"1-2 ramp-up sets on your first press"},
      exercises:[
        {id:"db-incline-press",name:"DB Incline Press",sets:2,rr:[10,12],rest:90,sw:50,inc:5,unit:"lbs/hand",notes:"30-45° bench, neutral grip while the right wrist settles",cue:"Feel the top of your chest stretch at the bottom. Drive the dumbbells up and in, then squeeze"},
        {id:"overhand-cable-row",name:"Overhand Cable Row",sets:2,rr:[10,12],rest:90,sw:140,inc:5,unit:"lbs",notes:"1s pause",cue:"Knuckles up, pull to your ribs. Pause and feel your upper back pinch for one second"},
        {id:"db-lateral-raise",name:"DB Lateral Raise",sets:2,rr:[10,12],rest:60,sw:20,inc:2.5,unit:"lbs/hand",notes:"Lead w/ elbows",cue:"Lead with your elbows, like pouring water from a pitcher. Feel the side of your shoulders float the weight"},
        {id:"low-high-cable-fly",name:"Low-to-High Cable Fly",sets:2,rr:[12,15],rest:60,sw:12.5,inc:2.5,unit:"lbs/side",notes:"Finisher, RIR 2",cue:"Sweep low to high and feel the top of your chest. Squeeze where your hands meet"},
        {id:"reverse-fly",name:"Reverse Fly (Pec Deck)",sets:2,rr:[10,12],rest:60,sw:90,inc:5,unit:"lbs",notes:"Rear delts on the pec deck",cue:"Lead with your elbows and pinch your shoulder blades. Feel the back of your shoulders, not your arms"},
      ]},
    friday:{name:"Lower B · Hypertrophy",focus:"Hypertrophy",reps:"10-12",
      warmup:{cardio:"5 min bike (easy pace)",moves:[
        {name:"Dead Bugs",rx:"10 per side, slow and controlled"},
        {name:"Half-Kneeling Psoas Stretch",rx:"30s per side, extra round on left"},
        {name:"QL Side Stretch",rx:"20s per side"},
      ],ramp:"1-2 ramp-up sets on your first exercise"},
      exercises:[
        {id:"machine-leg-press",name:"Machine Leg Press",sets:2,rr:[10,12],rest:90,sw:200,inc:10,unit:"lbs",anchor:true,notes:"Anchor · selectorized · new lift, set the weight on set 1",cue:"Brace, ribs down, pelvis quiet. Only as deep as you can without butt-wink or SI pinch; drive through your whole foot"},
        {id:"seated-leg-curl",name:"Seated Leg Curl",sets:2,rr:[10,12],rest:60,sw:90,inc:5,unit:"lbs",notes:"Comeback weight (last 110-115×8, Jul)",cue:"Pin your hips down, curl smoothly, slow on the way back"},
        {id:"leg-extension",name:"Leg Extension",sets:2,rr:[10,12],rest:60,sw:140,inc:5,unit:"lbs",notes:"Full squeeze · comeback weight (last 175 for 12,10, Aug 21)",cue:"Kick to full lockout and squeeze the front of your thigh hard for one second"},
        {id:"hip-abductor",name:"Hip Abductor",sets:2,rr:[12,15],rest:60,sw:70,inc:5,unit:"lbs",notes:"New lift · set the weight on set 1",cue:"Sit tall, push your knees out, pause one second, slow return"},
        {id:"seated-calf",name:"Seated Calf Raise",sets:2,rr:[10,12],rest:60,sw:90,inc:5,unit:"lbs",notes:"Slow full ROM",cue:"Targets soleus, full stretch at bottom, slow 2s up"},
      ]},
  },
  variants:{},
};
export const WU=w=>{if(!w||w<=0)return[];const s=[];
  if(w>=95)s.push({w:Math.round(w*.5/5)*5,r:10,l:"50%"});
  if(w>=135)s.push({w:Math.round(w*.7/5)*5,r:5,l:"70%"});
  if(w>=155)s.push({w:Math.round(w*.85/5)*5,r:3,l:"85%"});return s;};


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
  {id:"flat-bench",name:"Barbell Flat Bench",pattern:"chest-press",region:"chest",sw:175,unit:"lbs",inc:5,cue:"Retract scapula, feet driven into floor, touch and press",off:"Wk 1-2: right wrist. Returns wk 3 if the wrist allows"},
  {id:"converging-chest-press",name:"Converging Chest Press",pattern:"chest-press",region:"chest",sw:140,unit:"lbs",inc:5,cue:"Squeeze chest hard at peak contraction, controlled eccentric"},
  {id:"smith-flat-bench",name:"Smith Flat Bench",pattern:"chest-press",region:"chest",sw:135,unit:"lbs",inc:5,cue:"Retract scapula, drive through chest not shoulders"},
  {id:"smith-incline",name:"Smith Incline Press",pattern:"chest-press",region:"upper chest",sw:105,unit:"lbs",inc:5,cue:"Feel upper chest stretch at bottom, squeeze at top"},
  {id:"db-incline-press",name:"DB Incline Press",pattern:"chest-press",region:"upper chest",sw:40,unit:"lbs/hand",inc:5,cue:"30-45° bench, stretch under control, drive up and in"},
  {id:"machine-chest-press",name:"Machine Chest Press",pattern:"chest-press",region:"chest",sw:100,unit:"lbs",inc:5,cue:"Set handles mid-chest, pause lightly, press without shrugging"},
  // Rows / pulldowns
  {id:"seated-row",name:"Seated Row Machine",pattern:"horizontal-pull",region:"mid-back",sw:160,unit:"lbs",inc:5,cue:"Pull elbows past torso, squeeze mid-back hard"},
  {id:"overhand-cable-row",name:"Overhand Cable Row",pattern:"horizontal-pull",region:"upper back",sw:110,unit:"lbs",inc:5,cue:"Overhand grip hits upper back, pause and squeeze"},
  {id:"dumbbell-row",name:"DB Row",pattern:"horizontal-pull",region:"lats",sw:60,unit:"lbs/hand",inc:5,cue:"Row to hip, elbow close, full stretch at bottom"},
  {id:"chest-supported-row",name:"T-Bar Row (chest-supported)",pattern:"horizontal-pull",region:"mid-back",sw:70,unit:"lbs",inc:5,cue:"Chest pinned, pull elbows back, no body English"},
  {id:"lat-pulldown",name:"Lat Pulldown",pattern:"vertical-pull",region:"lats",sw:145,unit:"lbs",inc:5,cue:"Drive elbows down to hips, feel lats stretch at top"},
  {id:"close-grip-pulldown",name:"Close-Grip Pulldown",pattern:"vertical-pull",region:"lats",sw:130,unit:"lbs",inc:5,cue:"Squeeze lats hard at bottom, full stretch at top"},
  {id:"pull-ups",name:"Pull-ups",pattern:"vertical-pull",region:"lats",sw:0,unit:"BW",inc:0,cue:"Full hang, drive elbows down, chest tall"},
  // Shoulders
  {id:"smith-ohp",name:"Smith OHP",pattern:"vertical-press",region:"shoulders",sw:85,unit:"lbs",inc:5,cue:"Brace core tight, press straight overhead not forward"},
  {id:"db-shoulder-press",name:"DB Shoulder Press",pattern:"vertical-press",region:"shoulders",sw:35,unit:"lbs/hand",inc:2.5,cue:"Press straight overhead, ribs down, control the bottom"},
  {id:"machine-shoulder-press",name:"Machine Shoulder Press",pattern:"vertical-press",region:"shoulders",sw:70,unit:"lbs",inc:5,cue:"Seat low enough to press from chin height, don't shrug"},
  {id:"lateral-raise",name:"Cable Lateral Raise",pattern:"lateral-delt",region:"side delts",sw:12.5,unit:"lbs",inc:2.5,cue:"Elbows above wrists, pour water out of a pitcher"},
  {id:"db-lateral-raise",name:"DB Lateral Raise",pattern:"lateral-delt",region:"side delts",sw:15,unit:"lbs/hand",inc:2.5,cue:"Lead with elbows, slight forward lean, stop at shoulder height"},
  {id:"reverse-fly",name:"Reverse Fly (Pec Deck)",pattern:"rear-delt",region:"rear delts",sw:25,unit:"lbs",inc:5,cue:"Pinch shoulder blades, lead with elbows not hands"},
  {id:"face-pull",name:"Face Pull",pattern:"rear-delt",region:"rear delts",sw:40,unit:"lbs",inc:5,cue:"Pull to forehead, elbows high, rotate thumbs back"},
  // Quads / squat patterns
  {id:"back-squat",name:"Back Squat (BB)",pattern:"squat",region:"quads",sw:135,unit:"lbs",inc:10,cue:"Brace hard, sit between your legs, drive up out of the hole",off:"Wk 1-2: machine-only legs (SI)"},
  {id:"front-squat",name:"Front Squat (BB)",pattern:"squat",region:"quads",sw:135,unit:"lbs",inc:5,cue:"Elbows up, sit between legs, drive out of hole",off:"Wk 1-2: machine-only legs (SI)"},
  {id:"hack-squat",name:"Hack Squat",pattern:"squat",region:"quads",sw:180,unit:"lbs",inc:10,cue:"Knees track over toes, stay upright through core",off:"Left SI/psoas: permanently off"},
  {id:"leg-press",name:"Leg Press",pattern:"squat",region:"quads",sw:300,unit:"lbs",inc:10,cue:"Full depth, drive through whole foot not just toes"},
  {id:"goblet-squat",name:"Goblet Squat (DB)",pattern:"squat",region:"quads",sw:50,unit:"lbs",inc:5,cue:"Elbows inside knees, chest up, sit into hips",off:"Wk 1-2: machine-only legs (SI)"},
  {id:"leg-extension",name:"Leg Extension",pattern:"knee-extension",region:"quads",sw:70,unit:"lbs",inc:5,cue:"Lock out at top, squeeze quad hard, slow eccentric"},
  // Hip hinge / hamstrings
  {id:"deadlift",name:"Deadlift (BB)",pattern:"hinge",region:"posterior chain",sw:235,unit:"lbs",inc:10,cue:"Wedge in, brace hard, push the floor away · bar stays close",off:"Wk 1-2: no hinges (SI)"},
  {id:"rdl",name:"Romanian Deadlift",pattern:"hinge",region:"hamstrings",sw:125,unit:"lbs",inc:10,cue:"Push hips back like closing a car door, bar stays on legs",off:"Wk 1-2: no hinges (SI). DB RDL returns wk 3"},
  {id:"sldl",name:"Stiff-Leg Deadlift",pattern:"hinge",region:"hamstrings",sw:95,unit:"lbs",inc:10,cue:"Slight knee bend, hinge at hips, feel hamstring stretch",off:"No hinges (SI)"},
  {id:"cable-pull-through",name:"Cable Pull-Through",pattern:"hinge",region:"glutes/hamstrings",sw:70,unit:"lbs",inc:5,cue:"Push hips back, squeeze glutes at top, arms are hooks",off:"Wk 1-2: no hinges. Returns wk 3"},
  {id:"lying-leg-curl",name:"Lying Leg Curl",pattern:"leg-curl",region:"hamstrings",sw:90,unit:"lbs",inc:5,cue:"Drive heels toward glutes, squeeze hamstrings at peak"},
  {id:"seated-leg-curl",name:"Seated Leg Curl",pattern:"leg-curl",region:"hamstrings",sw:90,unit:"lbs",inc:5,cue:"Pin hips down, curl smoothly, slow negative"},
  // Calves / arms
  {id:"standing-calf",name:"Standing Calf Raise",pattern:"calf",region:"calves",sw:180,unit:"lbs",inc:10,cue:"Full stretch at bottom, drive up on big toe",off:"No standing calf machine at this gym"},
  {id:"seated-calf",name:"Seated Calf Raise",pattern:"calf",region:"calves",sw:90,unit:"lbs",inc:5,cue:"Targets soleus, full stretch at bottom, slow 2s up"},
  {id:"incline-db-curl",name:"Incline DB Curl",pattern:"biceps",region:"biceps",sw:15,unit:"lbs/hand",inc:2.5,cue:"Let arms hang fully stretched, don't swing"},
  {id:"cable-curl",name:"Cable Curl",pattern:"biceps",region:"biceps",sw:35,unit:"lbs",inc:5,cue:"Keep elbows forward, squeeze at top"},
  {id:"preacher-curl",name:"Preacher Curl",pattern:"biceps",region:"biceps",sw:40,unit:"lbs",inc:5,cue:"Full stretch at bottom, squeeze hard at top",off:"No preacher bench at this gym"},
  {id:"cable-hammer-curl",name:"Cable Hammer Curl (Rope)",pattern:"brachialis",region:"arms",sw:30,unit:"lbs",inc:5,cue:"Neutral grip, keep elbows pinned, squeeze at top"},
  {id:"db-hammer-curl",name:"DB Hammer Curl",pattern:"brachialis",region:"arms",sw:20,unit:"lbs/hand",inc:2.5,cue:"Thumbs up, no swing, control the negative"},
  {id:"oh-tricep-ext",name:"Overhead Tricep Extension",pattern:"triceps",region:"triceps",sw:40,unit:"lbs",inc:5,cue:"Keep elbows tight, stretch tricep fully, squeeze at top"},
  {id:"tricep-pushdown",name:"Tricep Pushdown",pattern:"triceps",region:"triceps",sw:50,unit:"lbs",inc:5,cue:"Pin elbows at sides, squeeze at bottom, control eccentric"},
  {id:"reverse-curl",name:"Reverse Curl",pattern:"forearms",region:"forearms",sw:40,unit:"lbs",inc:5,cue:"Overhand grip, slow controlled curl, feel forearms burn",off:"Right wrist: loaded wrist extension"},
  {id:"wrist-curl",name:"Wrist Curl",pattern:"forearms",region:"forearms",sw:20,unit:"lbs",inc:5,cue:"Let bar roll to fingertips, curl back up, squeeze forearms",off:"Right wrist"},
  // Planet Fitness Austin additions (Coach, 2026-10-05)
  {id:"db-flat-press",name:"DB Flat Press (neutral grip)",pattern:"chest-press",region:"chest",sw:50,unit:"lbs/hand",inc:5,cue:"Palms facing each other, elbows ~45°. Lower to a chest stretch, press up and in"},
  {id:"assisted-pull-up",name:"Assisted Pull-up Machine",pattern:"vertical-pull",region:"lats",sw:50,unit:"lbs assist",inc:5,cue:"Full hang, drive elbows down, chest tall. Less assist = harder"},
  {id:"low-cable-row",name:"Low Cable Row (cable stand)",pattern:"horizontal-pull",region:"mid-back",sw:120,unit:"lbs",inc:5,cue:"Sit tall, pull to your belly button, squeeze shoulder blades, slow return"},
  {id:"cable-reverse-fly",name:"Cable Reverse Fly",pattern:"rear-delt",region:"rear delts",sw:10,unit:"lbs/side",inc:2.5,cue:"Cross the cables, lead with elbows, pinch shoulder blades"},
  {id:"machine-leg-press",name:"Machine Leg Press",pattern:"squat",region:"quads",sw:200,unit:"lbs",inc:10,cue:"Brace, pelvis quiet, only as deep as you can without butt-wink or SI pinch"},
  {id:"glute-press",name:"Glute Press",pattern:"glute",region:"glutes",sw:50,unit:"lbs",inc:5,cue:"Hips square, drive through heel, squeeze glute at top, no low-back arch"},
  {id:"hip-abductor",name:"Hip Abductor",pattern:"glute",region:"glutes",sw:70,unit:"lbs",inc:5,cue:"Sit tall, push knees out, pause 1s, slow return"},
  {id:"leg-press-calf",name:"Calf Press (on leg press)",pattern:"calf",region:"calves",sw:180,unit:"lbs",inc:10,cue:"Balls of feet on the sled edge, full stretch, press through big toe"},
  {id:"machine-biceps-curl",name:"Seated Biceps Curl Machine",pattern:"biceps",region:"biceps",sw:40,unit:"lbs",inc:5,cue:"Elbows pinned to the pad, wrists neutral, full stretch, squeeze at top"},
  {id:"concentration-curl-machine",name:"Concentration Curl Machine",pattern:"biceps",region:"biceps",sw:30,unit:"lbs",inc:5,cue:"Arm on the pad, curl to full squeeze, slow negative"},
  {id:"machine-tricep-ext",name:"Seated Triceps Extension Machine",pattern:"triceps",region:"triceps",sw:50,unit:"lbs",inc:5,cue:"Elbows on the pad, press to full lockout, squeeze"},
  {id:"triceps-press-machine",name:"Triceps Press Machine (dip-style)",pattern:"triceps",region:"triceps",sw:90,unit:"lbs",inc:5,cue:"Shoulders down, press to lockout. Wrist check: neutral handles only"},
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

// ═══ PLATES ═══
export const BARBELL_IDS=new Set(["flat-bench","deadlift","rdl","back-squat","front-squat","sldl"]);
export const PLATES=[45,35,25,10,5,2.5];
export const plateMath=(total,bar=45)=>{let side=(Number(total)-bar)/2;if(!(side>=0))return null;const out=[];for(const p of PLATES){while(side>=p-1e-9){out.push(p);side-=p;}}return{perSide:out,leftover:+side.toFixed(1)};};
