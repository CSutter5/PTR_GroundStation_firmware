let ws = null;
let pollTimer = null;
let usingFallback = false;

// Client-side log: array of {timestamp, id, latitude, longitude, altitude, age}
const dataLog = [];
const MAX_LOG_ENTRIES = 100000; // safety cap so a long session doesn't exhaust browser memory

document.addEventListener("DOMContentLoaded", function() {
    connectWebSocket();

    const downloadBtn = document.getElementById("downloadLogBtn");
    if (downloadBtn) {
        downloadBtn.addEventListener("click", downloadLogAsCSV);
    }
});

function connectWebSocket() {
    const wsUrl = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws";
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket connected");
        stopFallbackPolling();
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            populateTable(data);
        } catch (e) {
            console.error("Failed to parse WS message:", e);
        }
    };

    ws.onerror = (err) => {
        console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
        console.log("WebSocket closed, falling back to polling");
        startFallbackPolling();
        // Try to reconnect the socket every 5s in the background
        setTimeout(connectWebSocket, 5000);
    };
}

function startFallbackPolling() {
    if (usingFallback) return;
    usingFallback = true;

    fetchAndPopulate(); // immediate refresh
    pollTimer = setInterval(fetchAndPopulate, 1000);
}

function stopFallbackPolling() {
    usingFallback = false;
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

function fetchAndPopulate() {
    fetch('/tracker_list_api')
        .then(response => response.json())
        .then(data => populateTable(data))
        .catch(error => console.error('Error fetching data:', error));
}

function populateTable(data) {
    logData(data);

    const tableBody = document.querySelector('#trackerTable tbody');
    tableBody.innerHTML = ""; // clear previous rows so we don't duplicate on refresh

    data.forEach(item => {
        const row = document.createElement('tr');

        const idCell = document.createElement('td');
        idCell.textContent = item.id;
        row.appendChild(idCell);

        const timeCell = document.createElement('td');
        timeCell.textContent = item.age;
        timeCell.classList.add('time-column');
        row.appendChild(timeCell);

        const latitudeCell = document.createElement('td');
        latitudeCell.textContent = item.latitude;
        row.appendChild(latitudeCell);

        const longitudeCell = document.createElement('td');
        longitudeCell.textContent = item.longitude;
        row.appendChild(longitudeCell);

        const altitudeCell = document.createElement('td');
        altitudeCell.textContent = item.altitude;
        altitudeCell.classList.add('altitude-column');
        row.appendChild(altitudeCell);

        const mapCell = document.createElement('td');
        const mapButton = document.createElement('button');
        mapButton.textContent = 'Go to Map';
        mapButton.onclick = (event) => {
            event.stopPropagation();
            const mapUrl = `https://www.google.com/maps?q=${item.latitude},${item.longitude}`;
            window.open(mapUrl, '_blank');
        };
        mapCell.classList.add('map-column');
        mapCell.appendChild(mapButton);
        row.appendChild(mapCell);

        row.onclick = () => {
            const mapUrl = `https://www.google.com/maps?q=${item.latitude},${item.longitude}`;
            window.open(mapUrl, '_blank');
        };

        tableBody.appendChild(row);
    });
}

function logData(data) {
    const timestamp = new Date().toISOString();

    data.forEach(item => {
        if (dataLog.length >= MAX_LOG_ENTRIES) {
            dataLog.shift(); // drop oldest entry to make room
        }
        dataLog.push({
            timestamp: timestamp,
            id: item.id,
            age: item.age,
            latitude: item.latitude,
            longitude: item.longitude,
            altitude: item.altitude
        });
    });

    updateLogCount();
}

function updateLogCount() {
    const counter = document.getElementById("logCount");
    if (counter) {
        counter.textContent = `${dataLog.length} entries logged`;
    }
}

function downloadLogAsCSV() {
    if (dataLog.length === 0) {
        alert("No data logged yet.");
        return;
    }

    const header = "timestamp,id,age_s,latitude,longitude,altitude\n";
    const rows = dataLog.map(entry =>
        `${entry.timestamp},${entry.id},${entry.age},${entry.latitude},${entry.longitude},${entry.altitude}`
    ).join("\n");

    const csvContent = header + rows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `tracker_log_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}