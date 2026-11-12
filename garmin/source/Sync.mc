// Talks to /api/wrist through Garmin Connect on the phone. One request at a time:
// send the oldest finished log, repeat until the outbox is empty, then refresh
// the plan. A failed send keeps the log; the next launch or "Sync now" retries.
import Toybox.Communications;
import Toybox.Lang;
import Toybox.WatchUi;

class SyncClient {
    var status as String = "";
    var busy as Boolean = false;

    function initialize() {
    }

    function headers() as Dictionary {
        return {
            "Authorization" => "Bearer " + Secrets.WRIST_TOKEN,
            "Content-Type" => Communications.REQUEST_CONTENT_TYPE_JSON
        };
    }

    function flush() as Void {
        if (busy) {
            return;
        }
        var out = Store.outbox();
        if (out.size() == 0) {
            fetchPlan();
            return;
        }
        busy = true;
        sendingId = (out[0] as Dictionary)["id"] as String;
        lastRefused = false;
        status = "Sending " + out.size() + (out.size() == 1 ? " workout" : " workouts");
        WatchUi.requestUpdate();
        Communications.makeWebRequest(Secrets.WRIST_URL, out[0] as Dictionary,
            { :method => Communications.HTTP_REQUEST_METHOD_POST, :headers => headers(),
              :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON },
            method(:onPost));
    }

    function onPost(code as Number, data as Dictionary or String or Null) as Void {
        busy = false;
        var out = Store.outbox();
        var sent = null;
        for (var i = 0; i < out.size(); i++) {
            if (((out[i] as Dictionary)["id"] as String).equals(sendingId)) {
                sent = out[i] as Dictionary;
            }
        }
        if (sent == null && (code == 200 || code == 400)) {
            // Trimmed from a full outbox while it was in flight; carry on with the rest.
            flush();
            return;
        }
        if (sent != null && (code == 200 || code == 400)) {
            if (code == 400) {
                // The server can never take this log: keep it aside so it does not block the rest.
                Store.keepRefused(sent);
                lastRefused = true;
            }
            Store.unqueue(sent["id"] as String);
            flush();
            return;
        }
        status = describe(code);
        WatchUi.requestUpdate();
        // The server answered but would not take it (401, 500...): still refresh the plan,
        // so a stuck log never leaves the watch on an old day. The log stays queued.
        if (code > 0) {
            var err = status;
            fetchPlan();
            pendingError = err;
        }
    }

    var pendingError as String? = null;
    var lastRefused as Boolean = false;
    var sendingId as String = "";

    function fetchPlan() as Void {
        // Never swap the plan under a session in progress.
        if (busy || Store.cur() != null) {
            return;
        }
        busy = true;
        status = "Getting today's plan";
        WatchUi.requestUpdate();
        Communications.makeWebRequest(Secrets.WRIST_URL, null,
            { :method => Communications.HTTP_REQUEST_METHOD_GET, :headers => { "Authorization" => "Bearer " + Secrets.WRIST_TOKEN },
              :responseType => Communications.HTTP_RESPONSE_CONTENT_TYPE_JSON },
            method(:onPlan));
    }

    function onPlan(code as Number, data as Dictionary or String or Null) as Void {
        busy = false;
        if (code == 200 && data instanceof Dictionary && data["v"] == 1 && Store.cur() == null) {
            Store.setPlan(data as Dictionary);
            status = pendingError != null ? pendingError as String : "Up to date";
        } else {
            status = describe(code);
        }
        pendingError = null;
        WatchUi.requestUpdate();
        // A workout finished while this request ran: send it now, not at the next launch.
        if (Store.outbox().size() > 0 && status.equals("Up to date")) {
            flush();
        }
    }

    function describe(code as Number) as String {
        if (code == Communications.BLE_CONNECTION_UNAVAILABLE) {
            return "Phone not connected";
        }
        if (code == 401) {
            return "Token rejected";
        }
        if (code == 503 || code == 500) {
            return "Health Hub busy";
        }
        if (code == Communications.NETWORK_REQUEST_TIMED_OUT || code == -2 || code == -300) {
            return "No signal. Try again";
        }
        return "Sync failed (" + code + ")";
    }
}
