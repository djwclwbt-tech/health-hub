// Screens for a 240 px round screen with five buttons (no touch).
//   START = the main action · UP/DOWN = reps · hold UP (menu) = more · BACK = back or undo
// Colors: ember (0xFF5500) marks the one thing you act on now, as in Health Hub.
import Toybox.Graphics;
import Toybox.Lang;
import Toybox.WatchUi;

const EMBER = 0xFF5500;
const GRAY = 0xAAAAAA;
const GREEN = 0x55FF55;

function runner() as Runner {
    return gRunner as Runner;
}

function fmtW(w as Numeric) as String {
    if (w instanceof Float || w instanceof Double) {
        var whole = w.toNumber();
        return w == whole ? whole.toString() : w.format("%.1f");
    }
    return w.toString();
}

// "185 lb", "40 ea", "BW"
function weightText(w as Numeric, unit as String) as String {
    if (unit.equals("BW") || w == 0) {
        return "BW";
    }
    return fmtW(w) + (unit.equals("") ? " lb" : " " + unit);
}

function fmtClock(sec as Number) as String {
    return (sec / 60).toString() + ":" + (sec % 60).format("%02d");
}

function centerText(dc as Dc, y as Number, font as Graphics.FontType, text as String, color as Number) as Void {
    dc.setColor(color, Graphics.COLOR_TRANSPARENT);
    dc.drawText(dc.getWidth() / 2, y, font, text, Graphics.TEXT_JUSTIFY_CENTER | Graphics.TEXT_JUSTIFY_VCENTER);
}

function clear(dc as Dc) as Void {
    dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
    dc.clear();
}

function hrLine() as String {
    var h = runner().hr;
    return h == null ? "" : "HR " + h;
}

function syncLine() as String {
    var n = Store.outbox().size();
    var s = (gSync as SyncClient).status;
    if (n > 0) {
        return n + " unsynced" + (s.equals("") ? "" : " - " + s);
    }
    return s;
}

// ── Home ───────────────────────────────────────────────────────────────────
class HomeView extends WatchUi.View {
    function initialize() {
        View.initialize();
    }

    function onUpdate(dc as Dc) as Void {
        clear(dc);
        var p = Store.plan();
        var c = Store.cur();
        if (c != null) {
            centerText(dc, 62, Graphics.FONT_TINY, "In progress", GRAY);
            centerText(dc, 100, Graphics.FONT_SMALL, c["name"] as String, Graphics.COLOR_WHITE);
            centerText(dc, 138, Graphics.FONT_TINY, (c["d"] as Array).size() + " sets done", GRAY);
            centerText(dc, 178, Graphics.FONT_SMALL, "START resumes", EMBER);
        } else if (p == null) {
            centerText(dc, 80, Graphics.FONT_SMALL, "No plan yet", Graphics.COLOR_WHITE);
            centerText(dc, 118, Graphics.FONT_XTINY, "Keep Garmin Connect", GRAY);
            centerText(dc, 140, Graphics.FONT_XTINY, "running on your phone", GRAY);
        } else if ((p["seq"] as Array).size() == 0) {
            centerText(dc, 92, Graphics.FONT_SMALL, p["name"] as String, Graphics.COLOR_WHITE);
            centerText(dc, 128, Graphics.FONT_XTINY, "Nothing to lift today", GRAY);
        } else {
            var stale = !(p["date"] as String).equals(Store.today());
            centerText(dc, 58, Graphics.FONT_XTINY, stale ? "Plan from " + p["date"] : "Today", stale ? EMBER : GRAY);
            centerText(dc, 96, Graphics.FONT_SMALL, p["name"] as String, Graphics.COLOR_WHITE);
            centerText(dc, 132, Graphics.FONT_TINY, (p["ex"] as Array).size() + " lifts - " + (p["seq"] as Array).size() + " sets", GRAY);
            centerText(dc, 172, Graphics.FONT_SMALL, "START", EMBER);
        }
        centerText(dc, 212, Graphics.FONT_XTINY, syncLine(), GRAY);
    }
}

class HomeDelegate extends WatchUi.BehaviorDelegate {
    function initialize() {
        BehaviorDelegate.initialize();
    }

    function onSelect() as Boolean {
        var p = Store.plan();
        if (Store.cur() == null && (p == null || (p["seq"] as Array).size() == 0)) {
            (gSync as SyncClient).flush();
            return true;
        }
        if (!runner().start()) {
            if (runner().finishedNow) {
                WatchUi.pushView(new DoneView(), new DoneDelegate(), WatchUi.SLIDE_LEFT);
            }
            return true;
        }
        var c = Store.cur();
        if (c != null && c["re"] != null && runner().restLeft() > 0) {
            WatchUi.pushView(new RestView(), new RestDelegate(), WatchUi.SLIDE_LEFT);
        } else {
            WatchUi.pushView(new SetView(), new SetDelegate(), WatchUi.SLIDE_LEFT);
        }
        return true;
    }

    function onMenu() as Boolean {
        (gSync as SyncClient).flush();
        return true;
    }
}

// ── Set: what to lift now ──────────────────────────────────────────────────
class SetView extends WatchUi.View {
    function initialize() {
        View.initialize();
    }

    function onShow() as Void {
        // Back from the menu or the finish prompt with the session closed.
        if (runner().finishedNow && Store.cur() == null) {
            WatchUi.switchToView(new DoneView(), new DoneDelegate(), WatchUi.SLIDE_IMMEDIATE);
        }
    }

    function onUpdate(dc as Dc) as Void {
        clear(dc);
        var r = runner();
        var c = Store.cur();
        var st = c == null ? null : r.step(c as Dictionary);
        if (st == null) {
            return;
        }
        var ei = st[0] as Number;
        var ex = r.exAt(ei);
        var sets = (ex["r"] as Array).size();
        centerText(dc, 34, Graphics.FONT_SMALL, ex["n"] as String, Graphics.COLOR_WHITE);
        centerText(dc, 64, Graphics.FONT_XTINY, "Set " + ((st[1] as Number) + 1) + " of " + sets, GRAY);
        centerText(dc, 100, Graphics.FONT_MEDIUM, weightText(r.weightFor(c as Dictionary, ei), ex["u"] as String), Graphics.COLOR_WHITE);
        centerText(dc, 152, Graphics.FONT_NUMBER_MEDIUM, r.repsFor(c as Dictionary, st).toString(), EMBER);
        centerText(dc, 190, Graphics.FONT_XTINY, "reps", GRAY);
        centerText(dc, 214, Graphics.FONT_XTINY, hrLine(), GRAY);
    }
}

class SetDelegate extends WatchUi.BehaviorDelegate {
    function initialize() {
        BehaviorDelegate.initialize();
    }

    function onSelect() as Boolean {
        runner().logSet();
        return true;
    }

    function onPreviousPage() as Boolean {
        runner().changeReps(1);
        WatchUi.requestUpdate();
        return true;
    }

    function onNextPage() as Boolean {
        runner().changeReps(-1);
        WatchUi.requestUpdate();
        return true;
    }

    function onMenu() as Boolean {
        var m = new WatchUi.Menu2({ :title => "Set" });
        var c = Store.cur();
        var st = c == null ? null : runner().step(c as Dictionary);
        var stepTxt = st == null ? "" : fmtW(runner().exAt(st[0] as Number)["st"] as Numeric);
        m.addItem(new WatchUi.MenuItem("Weight +" + stepTxt, null, :up, {}));
        m.addItem(new WatchUi.MenuItem("Weight -" + stepTxt, null, :down, {}));
        if (runner().doneCount() > 0) {
            m.addItem(new WatchUi.MenuItem("Undo last set", null, :undo, {}));
        }
        m.addItem(new WatchUi.MenuItem("Skip this set", null, :skipSet, {}));
        m.addItem(new WatchUi.MenuItem("Skip this lift", null, :skipLift, {}));
        m.addItem(new WatchUi.MenuItem("Goal", goalText(), :goal, {}));
        m.addItem(new WatchUi.MenuItem("Finish workout", null, :finish, {}));
        WatchUi.pushView(m, new SetMenuDelegate(), WatchUi.SLIDE_UP);
        return true;
    }

    function goalText() as String {
        var c = Store.cur();
        var st = c == null ? null : runner().step(c as Dictionary);
        return st == null ? "" : runner().exAt(st[0] as Number)["g"] as String;
    }

    // BACK mid-session asks before closing; the session is safe either way.
    function onBack() as Boolean {
        WatchUi.pushView(new WatchUi.Confirmation("Finish workout?"), new FinishConfirm(), WatchUi.SLIDE_UP);
        return true;
    }
}

class SetMenuDelegate extends WatchUi.Menu2InputDelegate {
    function initialize() {
        Menu2InputDelegate.initialize();
    }

    function onSelect(item as WatchUi.MenuItem) as Void {
        var id = item.getId();
        if (id == :goal) {
            return;
        }
        WatchUi.popView(WatchUi.SLIDE_DOWN);
        var r = runner();
        if (id == :up) {
            r.changeWeight(1);
        } else if (id == :down) {
            r.changeWeight(-1);
        } else if (id == :undo) {
            r.undo();
        } else if (id == :skipSet) {
            r.skipSet();
        } else if (id == :skipLift) {
            r.skipLift();
        } else if (id == :finish) {
            r.finish();
            WatchUi.switchToView(new DoneView(), new DoneDelegate(), WatchUi.SLIDE_IMMEDIATE);
        }
        WatchUi.requestUpdate();
    }
}

class FinishConfirm extends WatchUi.ConfirmationDelegate {
    function initialize() {
        ConfirmationDelegate.initialize();
    }

    function onResponse(response as WatchUi.Confirm) as Boolean {
        if (response == WatchUi.CONFIRM_YES) {
            // SetView.onShow sees finishedNow once this prompt closes.
            runner().finish();
        }
        return true;
    }
}

// ── Rest ───────────────────────────────────────────────────────────────────
class RestView extends WatchUi.View {
    function initialize() {
        View.initialize();
    }

    function onUpdate(dc as Dc) as Void {
        clear(dc);
        var r = runner();
        var c = Store.cur();
        if (c == null) {
            return;
        }
        centerText(dc, 44, Graphics.FONT_TINY, "Rest", GRAY);
        centerText(dc, 104, Graphics.FONT_NUMBER_HOT, fmtClock(r.restLeft()), EMBER);
        var st = r.step(c);
        if (st != null) {
            var ei = st[0] as Number;
            var ex = r.exAt(ei);
            centerText(dc, 160, Graphics.FONT_TINY, ex["n"] as String, Graphics.COLOR_WHITE);
            centerText(dc, 188, Graphics.FONT_XTINY, weightText(r.weightFor(c, ei), ex["u"] as String) + " x " + r.repsFor(c, st), GRAY);
        }
        centerText(dc, 214, Graphics.FONT_XTINY, hrLine(), GRAY);
    }
}

class RestDelegate extends WatchUi.BehaviorDelegate {
    function initialize() {
        BehaviorDelegate.initialize();
    }

    // START: done resting, go now.
    function onSelect() as Boolean {
        runner().endRest(false);
        return true;
    }

    // BACK: that set was a mistake, take it back.
    function onBack() as Boolean {
        runner().undo();
        return true;
    }
}

// ── Done ───────────────────────────────────────────────────────────────────
class DoneView extends WatchUi.View {
    function initialize() {
        View.initialize();
    }

    function onUpdate(dc as Dc) as Void {
        clear(dc);
        var s = runner().lastSummary;
        centerText(dc, 64, Graphics.FONT_MEDIUM, "Done", GREEN);
        if (s != null) {
            centerText(dc, 106, Graphics.FONT_SMALL, s["name"] as String, Graphics.COLOR_WHITE);
            centerText(dc, 140, Graphics.FONT_TINY, s["sets"] + " sets - " + s["min"] + " min", GRAY);
        }
        var saved = runner().lastLogSaved();
        if (saved == null) {
            centerText(dc, 184, Graphics.FONT_XTINY, "Nothing logged", GRAY);
        } else if (saved) {
            centerText(dc, 184, Graphics.FONT_XTINY, "Saved to Health Hub", GREEN);
        } else if ((gSync as SyncClient).lastRefused) {
            centerText(dc, 184, Graphics.FONT_XTINY, "Health Hub refused it", EMBER);
        } else {
            centerText(dc, 184, Graphics.FONT_XTINY, syncLine(), EMBER);
        }
    }
}

class DoneDelegate extends WatchUi.BehaviorDelegate {
    function initialize() {
        BehaviorDelegate.initialize();
    }

    function onSelect() as Boolean {
        WatchUi.popView(WatchUi.SLIDE_DOWN);
        return true;
    }

    function onBack() as Boolean {
        WatchUi.popView(WatchUi.SLIDE_DOWN);
        return true;
    }
}
