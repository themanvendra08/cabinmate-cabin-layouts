function calculateAndFormatDates(startDateStr, durationType, durationValue) {
  const startDate = new Date(startDateStr.split("/").reverse().join("-"));
  const endDate = new Date(startDate);

  switch (durationType?.toLowerCase()) {
    case "daily use":
    case "day use":
    case "daily":
    case "day":
    case "hourly use":
    case "hourly": {
      endDate.setDate(startDate.getDate() + durationValue - 1);
      break;
    }
    case "monthly use":
    case "monthly": {
      endDate.setMonth(endDate.getMonth() + durationValue);
      endDate.setDate(endDate.getDate() - 1);
      break;
    }
    case "yearly use":
    case "yearly": {
      endDate.setFullYear(startDate.getFullYear() + durationValue);
      endDate.setDate(endDate.getDate() - 1);
      break;
    }
    default:
      throw new Error("Invalid booking duration");
  }

  const formattedStartDate = startDate.toISOString().split("T")[0];
  const formattedEndDate = endDate.toISOString().split("T")[0];
  return [formattedStartDate, formattedEndDate];
}

const loadingOverlay = document.getElementById("loadingOverlay"); // Reference to the loading overlay

document.addEventListener("click", function (event) {
  const seat = event.target.closest(".horizontalSeat, .verticalSeat");
  if (seat) {
    const seatId = seat.id;                 // e.g. "174"
    const seatName = seat.innerText.trim().split("\n")[0]?.trim();
    if (seat.style.cursor === "pointer") {
      window.parent.postMessage({ seatId, seatName }, "*");
    } else {
      window.parent.postMessage({ seatId: null, seatName: null, }, "*");
    }
  }
});

document.addEventListener("DOMContentLoaded", async function () {
  // Inject tooltip CSS styles
  const style = document.createElement("style");
  style.textContent = `
    .seat-tooltip {
      position: relative;
    }
    .seat-tooltip .tooltip-content {
      visibility: hidden;
      background-color: rgba(0, 0, 0, 0.9);
      color: #fff;
      text-align: left;
      padding: 8px 12px;
      border-radius: 6px;
      position: absolute;
      z-index: 1000;
      bottom: 125%;
      left: 50%;
      transform: translateX(-50%);
      white-space: nowrap;
      opacity: 0;
      transition: opacity 0.3s;
      font-size: 12px;
      line-height: 1.5;
      pointer-events: none;
    }
    /* Force horizontal text for tooltips inside vertical seats */
    .verticalSeat .tooltip-content {
      writing-mode: horizontal-tb;
    }
    .seat-tooltip .tooltip-content::after {
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: rgba(0, 0, 0, 0.9);
    }
    .seat-tooltip:hover .tooltip-content {
      visibility: visible;
      opacity: 1;
    }
  `;
  document.head.appendChild(style);

  const paramsString = new URLSearchParams(window.location.search);
  let params = paramsString.get("params");
  const requiredParams = [
    "franchise_id",
    "s_date",
    "b_duration",
    "cabin_type",
    "d_value",
    "id",
  ];

  if (!params) {
    console.error(
      `No search params provided, Please provide these params ${requiredParams.join(
        ", "
      )}`
    );
    return;
  }

  let apiPayload = {};
  params = params.replaceAll("^", "&").replaceAll("~", "=");
  params = new URLSearchParams(params);

  const missingParams = requiredParams.filter((param) => !params.has(param));
  if (missingParams.length > 0) {
    console.error(`Missing required parameters: ${missingParams.join(", ")}`);
    return;
  } else {
    apiPayload["franchise_id"] = params.get("franchise_id");
    apiPayload["s_date"] = params.get("s_date");
    apiPayload["b_duration"] = params.get("b_duration");
    apiPayload["cabin_type"] = params.get("cabin_type");
    apiPayload["d_value"] = params.get("d_value");
    apiPayload["id"] = params.get("id");
    apiPayload["type"] = params.get("cabin_type") === "Conference Room" ? "conference_room" : params.get("cabin_type") === "Office Cabin" ? "office_cabin" : "reading_space"
    if (apiPayload["cabin_type"] === "Conference Room") {
      apiPayload["s_time"] = params.get("s_time");
      apiPayload["e_time"] = params.get("e_time");
    }
  }

  // Show loading overlay while processing
  loadingOverlay.classList.remove("hidden");

  const horizontalSeats = document.querySelectorAll(".horizontalSeat");
  const verticalSeats = document.querySelectorAll(".verticalSeat");

  function postSeatMessage(seatDiv) {
    console.log(seatDiv);
    if (!seatDiv) return;
    const seatId = seatDiv.id;
    const seatName = seatDiv.innerText.trim().split("\n")[0]?.trim();
    // React Native WebView
    window.ReactNativeWebView.postMessage(JSON.stringify({ seatId, seatName }));
    // Parent window
    window.parent.postMessage({ seatId, seatName, }, "*");
  }

  horizontalSeats.forEach((seat) => {
    seat.addEventListener("click", function () {
      if (seat.style.cursor === "pointer") {
        console.log("Clicked available seat");
        postSeatMessage(seat);
      } else {
        console.log("Seat not available");
      }
    });
  });

  verticalSeats.forEach((seat) => {
    seat.addEventListener("click", function () {
      if (seat.style.cursor === "pointer") {
        console.log("Clicked available seat");
        postSeatMessage(seat);
      } else {
        console.log("Seat not available");
      }
    });
  });

  let seatsData;
  const getCabinLayoutPayload = {
    bookingDuration: apiPayload.b_duration,
    durationValue: apiPayload.d_value,
    franchiseName: apiPayload.franchise_id,
    bookingStartDate: apiPayload.s_date,
    userId: apiPayload.id,
    type: apiPayload.type,
    startTime: apiPayload.s_time,
    endTime: apiPayload.e_time
  };

  const cabinType = apiPayload.cabin_type;
  try {
    const result = await fetch(
      "https://qa-cmapi.zysk.in/api/bookings/cabin-layout",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getCabinLayoutPayload),
      }
    );

    const [startDate, endDate] = calculateAndFormatDates(
      getCabinLayoutPayload.bookingStartDate,
      getCabinLayoutPayload.bookingDuration,
      getCabinLayoutPayload.durationValue
    );

    const tempCabins = await fetch(
      `https://qa-cmapi.zysk.in/api/bookings/temp-cabin?franchiseName=${getCabinLayoutPayload.franchiseName}&bookingStartDate=${startDate}&bookingEndDate=${endDate}&cabinType=${cabinType}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const tempCabinsData = await tempCabins.json();
    const seatIds = tempCabinsData.result.map((cabin) => cabin.seatId);

    const response = await result.json();
    seatsData = response.result;
    console.log("seatsData", seatsData)

    if (seatsData) {
      processSeatsData(seatsData, seatIds);
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  } finally {
    // Hide loading overlay once processing is done
    loadingOverlay.classList.add("hidden");
  }

  function processSeatsData(seatsData, seatIds) {
    seatsData.forEach((seat) => {
      const seatDiv = document.getElementById(seat.id);
      if (!seatDiv) return;

      if (cabinType !== seat.cabintype_name) {
        setupSeat(seatDiv, seat);
        hideSeat(seatDiv);
        return;
      }
      if (seatIds.length && seatIds.includes(seat.cabin_name)) {
        setupSeat(seatDiv, seat);
        hideSeat(seatDiv);
        return;
      }
      setupSeat(seatDiv, seat);
      seatDiv.addEventListener("click", function () {
        handleSeatSelection(seatDiv, seat);
      });
    });
  }

  function hideSeat(seatDiv) {
    seatDiv.style.backgroundColor = "#eeeeee";
    seatDiv.style.color = "white";
    seatDiv.style.border = "none";
    seatDiv.style.cursor = "not-allowed";
  }

  function setupSeat(seatDiv, seat) {
    seatDiv.classList.add("seat", seat.availability_status);
    seatDiv.style.cursor =
      seat.availability_status === "available" ? "pointer" : "default";
    seatDiv.textContent = seat.cabin_name;
    
    // Add tooltip if both seats and description are not empty strings
    if (seat.seats && seat.seats !== "" && seat.description && seat.description !== "") {
      seatDiv.classList.add("seat-tooltip");
      const tooltipContent = document.createElement("div");
      tooltipContent.className = "tooltip-content";
      tooltipContent.innerHTML = `No. of Seats: ${seat.seats}<br>Description: ${seat.description}`;
      seatDiv.appendChild(tooltipContent);
    }
  }

  let selectedSeat = null;
  function handleSeatSelection(seatDiv, seat) {
    if (seat.availability_status === "available") {
      if (selectedSeat) {
        selectedSeat.classList.remove("selected");
      }
      if (selectedSeat !== seatDiv) {
        seatDiv.classList.add("selected");
        selectedSeat = seatDiv;
      } else {
        selectedSeat = null;
      }
    }
  }
});
