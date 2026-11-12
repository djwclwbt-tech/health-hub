// Health Hub Gym · Forerunner 245 watch app.
// The plan comes from Health Hub (/api/wrist) through Garmin Connect on the phone,
// the session runs offline on the watch, and the set log goes back the same way.
// Design: docs/garmin-2026-11/design.md.
import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

var gRunner as Runner?;
var gSync as SyncClient?;

class GymApp extends Application.AppBase {
    function initialize() {
        AppBase.initialize();
    }

    function onStart(state as Dictionary?) as Void {
        gRunner = new Runner();
        gSync = new SyncClient();
    }

    function onStop(state as Dictionary?) as Void {
        // The session itself is saved after every press; only the FIT recording needs closing.
        if (gRunner != null) {
            (gRunner as Runner).suspend((gRunner as Runner).doneCount() > 0);
        }
    }

    function getInitialView() {
        // Send any finished logs, then refresh today's plan (never mid-session).
        (gSync as SyncClient).flush();
        return [new HomeView(), new HomeDelegate()];
    }
}
