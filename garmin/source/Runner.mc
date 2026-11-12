// The session on the wrist. It walks the plan's "seq" list (the server already put
// supersets in order), so the watch never decides what comes next. Every press
// rewrites Store "cur", so a killed app resumes on the same set.
//   cur = { pid, date, day, name, t0, k (step), d (done rows), s (skipped [ei,si]),
//           w (weight per lift, Dictionary exIdx -> weight), r (reps for this set or null),
//           re (rest ends at, epoch s, or null) }
// Done row, as the server reads it: [exIdx, exId, setIdx, weight, reps, atSec, hrAvg, hrMax, step]
import Toybox.Activity;
import Toybox.ActivityRecording;
import Toybox.Attention;
import Toybox.Lang;
import Toybox.Math;
import Toybox.Sensor;
import Toybox.Timer;
import Toybox.WatchUi;

class Runner {
    var rec as ActivityRecording.Session?;
    var timer as Timer.Timer?;
    var hr as Number? = null;
    var hrSum as Number = 0;
    var hrN as Number = 0;
    var hrMax as Number = 0;
    var finishedNow as Boolean = false;

    function initialize() {
    }

    // ── reading the plan and the session ───────────────────────────────────
    function plan() as Dictionary? {
        return Store.plan();
    }

    function active() as Boolean {
        return Store.cur() != null;
    }

    function steps() as Array {
        var p = plan();
        return p == null ? [] : p["seq"] as Array;
    }

    function step(c as Dictionary) as Array? {
        var all = steps();
        var k = c["k"] as Number;
        return k < all.size() ? all[k] as Array : null;
    }

    function exAt(ei as Number) as Dictionary {
        return ((plan() as Dictionary)["ex"] as Array)[ei] as Dictionary;
    }

    function weightFor(c as Dictionary, ei as Number) as Numeric {
        var w = (c["w"] as Dictionary)[ei];
        return w != null ? w as Numeric : exAt(ei)["w"] as Numeric;
    }

    function repsFor(c as Dictionary, st as Array) as Number {
        if (c["r"] != null) {
            return c["r"] as Number;
        }
        var r = exAt(st[0] as Number)["r"] as Array;
        var si = st[1] as Number;
        return (si < r.size() ? r[si] : r[r.size() - 1]) as Number;
    }

    function isSkipped(c as Dictionary, st as Array) as Boolean {
        var s = c["s"] as Array;
        for (var i = 0; i < s.size(); i++) {
            var x = s[i] as Array;
            if (x[0] == st[0] && x[1] == st[1]) {
                return true;
            }
        }
        return false;
    }

    // The next step at or after k that was not skipped.
    function nextK(c as Dictionary, k as Number) as Number {
        var all = steps();
        while (k < all.size() && isSkipped(c, all[k] as Array)) {
            k++;
        }
        return k;
    }

    function doneCount() as Number {
        var c = Store.cur();
        return c == null ? 0 : (c["d"] as Array).size();
    }

    // ── starting and resuming ──────────────────────────────────────────────
    // Returns false when there is nothing to run.
    function start() as Boolean {
        var p = plan();
        var c = Store.cur();
        if (c != null && (p == null || !(p["id"] as String).equals(c["pid"] as String))) {
            // The plan this session followed is gone: close what was logged.
            finish();
            return false;
        }
        if (c == null && (p == null || (p["seq"] as Array).size() == 0)) {
            return false;
        }
        if (c != null && c["re"] != null && restLeft() == 0) {
            // Rest ran out while the app was closed: no buzz, straight to the set.
            c["re"] = null;
            Store.setCur(c);
        }
        if (c == null) {
            Store.setCur({ "pid" => p["id"], "date" => p["date"], "day" => p["day"], "name" => p["name"],
                "t0" => Store.now(), "k" => 0, "d" => [], "s" => [], "w" => {}, "r" => null, "re" => null });
        }
        finishedNow = false;
        startSensors();
        startRecording();
        resetHr();
        if (timer == null) {
            timer = new Timer.Timer();
            (timer as Timer.Timer).start(method(:tick), 1000, true);
        }
        return true;
    }

    function startSensors() as Void {
        Sensor.setEnabledSensors([Sensor.SENSOR_HEARTRATE]);
        Sensor.enableSensorEvents(method(:onSensor));
    }

    function startRecording() as Void {
        if (rec != null || !(Toybox has :ActivityRecording)) {
            return;
        }
        rec = ActivityRecording.createSession({ :name => "Strength", :sport => Activity.SPORT_TRAINING,
            :subSport => Activity.SUB_SPORT_STRENGTH_TRAINING });
        (rec as ActivityRecording.Session).start();
    }

    // Close the FIT recording and stop timers. Leaving the app mid-session saves what was
    // recorded so far; resuming starts a new recording, so one gym visit can become two
    // Garmin activities. Health Hub's own log is still one workout.
    function suspend(save as Boolean) as Void {
        if (timer != null) {
            (timer as Timer.Timer).stop();
            timer = null;
        }
        if (rec != null && (rec as ActivityRecording.Session).isRecording()) {
            (rec as ActivityRecording.Session).stop();
            if (save) {
                (rec as ActivityRecording.Session).save();
            } else {
                (rec as ActivityRecording.Session).discard();
            }
        }
        rec = null;
    }

    // ── heart rate during the set ──────────────────────────────────────────
    function onSensor(info as Sensor.Info) as Void {
        var h = info.heartRate;
        hr = h;
        var c = Store.cur();
        if (h != null && c != null && c["re"] == null) {
            hrSum += h;
            hrN += 1;
            if (h > hrMax) {
                hrMax = h;
            }
        }
    }

    function resetHr() as Void {
        hrSum = 0;
        hrN = 0;
        hrMax = 0;
    }

    // ── the clock: rest countdown and the buzz at zero ─────────────────────
    function restLeft() as Number {
        var c = Store.cur();
        if (c == null || c["re"] == null) {
            return 0;
        }
        var left = (c["re"] as Number) - Store.now();
        return left > 0 ? left : 0;
    }

    function tick() as Void {
        var c = Store.cur();
        if (c != null && c["re"] != null && restLeft() == 0) {
            endRest(true);
        }
        WatchUi.requestUpdate();
    }

    function endRest(buzz as Boolean) as Void {
        var c = Store.cur();
        if (c == null) {
            return;
        }
        c["re"] = null;
        Store.setCur(c);
        resetHr();
        if (buzz) {
            alert();
        }
        WatchUi.switchToView(new SetView(), new SetDelegate(), WatchUi.SLIDE_IMMEDIATE);
    }

    function alert() as Void {
        if (Attention has :vibrate) {
            Attention.vibrate([new Attention.VibeProfile(100, 400), new Attention.VibeProfile(0, 200), new Attention.VibeProfile(100, 400)]);
        }
        if (Attention has :playTone) {
            Attention.playTone(Attention.TONE_LOUD_BEEP);
        }
        if (Attention has :backlight) {
            Attention.backlight(true);
        }
    }

    // ── presses ────────────────────────────────────────────────────────────
    function changeReps(delta as Number) as Void {
        var c = Store.cur();
        var st = c == null ? null : step(c as Dictionary);
        if (st == null) {
            return;
        }
        var r = repsFor(c as Dictionary, st) + delta;
        c["r"] = r < 1 ? 1 : (r > 50 ? 50 : r);
        Store.setCur(c);
    }

    function changeWeight(sign as Number) as Void {
        var c = Store.cur();
        var st = c == null ? null : step(c as Dictionary);
        if (st == null) {
            return;
        }
        var ei = st[0] as Number;
        var w = weightFor(c as Dictionary, ei) + sign * (exAt(ei)["st"] as Numeric);
        var wd = c["w"] as Dictionary;
        wd[ei] = w < 0 ? 0 : w;
        Store.setCur(c);
    }

    // START on the set screen: log it as shown, then rest or move on.
    function logSet() as Void {
        var c = Store.cur();
        var st = c == null ? null : step(c as Dictionary);
        if (st == null) {
            return;
        }
        var ei = st[0] as Number;
        var k = c["k"] as Number;
        var avg = hrN > 0 ? hrSum / hrN : null;
        (c["d"] as Array).add([ei, exAt(ei)["i"], st[1], weightFor(c, ei), repsFor(c, st), Store.now(), avg, hrMax > 0 ? hrMax : null, k]);
        if (rec != null) {
            (rec as ActivityRecording.Session).addLap();
        }
        advance(c, st[2] as Number);
    }

    function skipSet() as Void {
        var c = Store.cur();
        var st = c == null ? null : step(c as Dictionary);
        if (st == null) {
            return;
        }
        (c["s"] as Array).add([st[0], st[1]]);
        advance(c, 0);
    }

    // Skip every set of this lift that is still ahead.
    function skipLift() as Void {
        var c = Store.cur();
        var st = c == null ? null : step(c as Dictionary);
        if (st == null) {
            return;
        }
        var all = steps();
        for (var i = c["k"] as Number; i < all.size(); i++) {
            var x = all[i] as Array;
            if (x[0] == st[0]) {
                (c["s"] as Array).add([x[0], x[1]]);
            }
        }
        advance(c, 0);
    }

    function advance(c as Dictionary, rest as Number) as Void {
        c["r"] = null;
        c["k"] = nextK(c, (c["k"] as Number) + 1);
        var more = step(c) != null;
        c["re"] = more && rest > 0 ? Store.now() + rest : null;
        Store.setCur(c);
        resetHr();
        if (!more) {
            finish();
            WatchUi.switchToView(new DoneView(), new DoneDelegate(), WatchUi.SLIDE_UP);
        } else if (c["re"] != null) {
            WatchUi.switchToView(new RestView(), new RestDelegate(), WatchUi.SLIDE_UP);
        } else {
            WatchUi.switchToView(new SetView(), new SetDelegate(), WatchUi.SLIDE_LEFT);
        }
    }

    // BACK on the rest screen: take the last set back and redo it.
    function undo() as Void {
        var c = Store.cur();
        if (c == null) {
            return;
        }
        var d = c["d"] as Array;
        if (d.size() == 0) {
            return;
        }
        var row = d[d.size() - 1] as Array;
        c["d"] = d.slice(0, d.size() - 1);
        c["k"] = row[8];
        c["r"] = row[4];
        var wd = c["w"] as Dictionary;
        wd[row[0]] = row[3];
        c["re"] = null;
        Store.setCur(c);
        resetHr();
        WatchUi.switchToView(new SetView(), new SetDelegate(), WatchUi.SLIDE_RIGHT);
    }

    // Close the session: save the FIT file, queue the log for the phone, send.
    function finish() as Void {
        var c = Store.cur();
        if (c == null) {
            return;
        }
        var d = c["d"] as Array;
        suspend(d.size() > 0);
        lastLogId = null;
        if (d.size() > 0) {
            // End at the last set (plus two minutes) if the session was left open.
            var lastAt = (d[d.size() - 1] as Array)[5] as Number;
            var t1 = Store.now();
            if (t1 > lastAt + 600) {
                t1 = lastAt + 120;
            }
            var id = Store.now().format("%x") + (Math.rand() & 0xffffff).format("%06x");
            lastLogId = id;
            Store.queue({ "v" => 1, "id" => id, "plan" => c["pid"], "date" => c["date"], "day" => c["day"],
                "t0" => c["t0"], "t1" => t1, "d" => d, "k" => c["s"] });
        }
        lastSummary = { "sets" => d.size(), "min" => (Store.now() - (c["t0"] as Number)) / 60, "name" => c["name"] };
        Store.setCur(null);
        finishedNow = true;
        Sensor.enableSensorEvents(null);
        Sensor.setEnabledSensors([]);
        (gSync as SyncClient).flush();
    }

    // Was the last finished log taken by the server? null = nothing was logged.
    function lastLogSaved() as Boolean? {
        if (lastLogId == null) {
            return null;
        }
        var o = Store.outbox();
        for (var i = 0; i < o.size(); i++) {
            if (((o[i] as Dictionary)["id"] as String).equals(lastLogId as String)) {
                return false;
            }
        }
        return !(gSync as SyncClient).lastRefused;
    }

    var lastLogId as String? = null;
    var lastSummary as Dictionary? = null;
}
