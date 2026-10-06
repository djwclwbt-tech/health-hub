// Frozen Summer Cut v2 days (pre 2026-10-05). Engine tests exercise progression
// logic against this fixed program so live program edits don't break them.
export const OLD_DAYS={
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
  };
