// Everything the watch keeps between launches, in Application.Storage:
//   "plan" · today's plan from the server (Dictionary, see the design doc)
//   "cur"  · the session in progress, rewritten after every press
//   "out"  · finished logs waiting for the phone (oldest first)
import Toybox.Application;
import Toybox.Lang;
import Toybox.Time;
import Toybox.Time.Gregorian;

module Store {
    const MAX_OUTBOX = 6;
    // Storage reads deserialize every time; the screen redraws each second. Cache them.
    var planCache as Dictionary? = null;
    var planLoaded as Boolean = false;
    var curCache as Dictionary? = null;
    var curLoaded as Boolean = false;

    function plan() as Dictionary? {
        if (!planLoaded) {
            planCache = Application.Storage.getValue("plan") as Dictionary?;
            planLoaded = true;
        }
        return planCache;
    }

    function setPlan(p as Dictionary) as Void {
        Application.Storage.setValue("plan", p);
        planCache = p;
        planLoaded = true;
    }

    function cur() as Dictionary? {
        if (!curLoaded) {
            curCache = Application.Storage.getValue("cur") as Dictionary?;
            curLoaded = true;
        }
        return curCache;
    }

    function setCur(c as Dictionary?) as Void {
        if (c == null) {
            Application.Storage.deleteValue("cur");
        } else {
            Application.Storage.setValue("cur", c);
        }
        curCache = c;
        curLoaded = true;
    }

    function outbox() as Array {
        var o = Application.Storage.getValue("out");
        return o == null ? [] : o as Array;
    }

    function setOutbox(o as Array) as Void {
        Application.Storage.setValue("out", o);
    }

    function queue(log as Dictionary) as Void {
        var o = outbox();
        o.add(log);
        // A watch that never reaches the phone keeps the newest logs, not the oldest.
        while (o.size() > MAX_OUTBOX) {
            o = o.slice(1, null);
        }
        setOutbox(o);
    }

    // Take one log out of the outbox by its id (the outbox may have changed while a request ran).
    function unqueue(id as String) as Void {
        var o = outbox();
        var keep = [];
        for (var i = 0; i < o.size(); i++) {
            var log = o[i] as Dictionary;
            if (!(log["id"] as String).equals(id)) {
                keep.add(log);
            }
        }
        setOutbox(keep);
    }

    // A log the server refused (400) is kept here, never deleted, so nothing is lost silently.
    function keepRefused(log as Dictionary) as Void {
        var r = Application.Storage.getValue("bad");
        var a = r == null ? [] : r as Array;
        a.add(log);
        while (a.size() > 3) {
            a = a.slice(1, null);
        }
        Application.Storage.setValue("bad", a);
    }

    // The phone's date, as the server writes it: YYYY-MM-DD.
    function today() as String {
        var t = Gregorian.info(Time.now(), Time.FORMAT_SHORT);
        return Lang.format("$1$-$2$-$3$", [t.year, (t.month as Number).format("%02d"), t.day.format("%02d")]);
    }

    function now() as Number {
        return Time.now().value();
    }
}
