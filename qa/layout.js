function calculateAndFormatDates(startDateStr, durationType, durationValue) {
  const startDate = new Date(startDateStr.split('/').reverse().join('-'))
  const endDate = new Date(startDate)

  switch (durationType?.toLowerCase()) {
    case 'daily use':
    case 'day use':
    case 'daily':
    case 'day': {
      endDate.setDate(startDate.getDate() + durationValue - 1)
      break
    }
    case 'monthly use':
    case 'monthly': {
      endDate.setMonth(endDate.getMonth() + durationValue)
      endDate.setDate(endDate.getDate() - 1)
      break
    }
    case 'yearly use':
    case 'yearly': {
      endDate.setFullYear(startDate.getFullYear() + durationValue)
      endDate.setDate(endDate.getDate() - 1)
      break
    }
    default:
      throw new Error('Invalid booking duration')
  }

  const formattedStartDate = startDate.toISOString().split('T')[0]
  const formattedEndDate = endDate.toISOString().split('T')[0]
  return [formattedStartDate, formattedEndDate]
}

const loadingOverlay = document.getElementById('loadingOverlay') // Reference to the loading overlay

document.addEventListener("click", function (event) {
  const seat = event.target.closest(".horizontalSeat, .verticalSeat");
  if (seat) {
    const seatNumber = seat.innerHTML;
    if (seat.style.cursor === "pointer") {
      window.parent.postMessage({ seatNumber }, "*");
    } else {
      window.parent.postMessage({ seatNumber: null }, "*");
    }
  }
});

document.addEventListener('DOMContentLoaded', async function () {
  const paramsString = new URLSearchParams(window.location.search)
  let params = paramsString.get('params')
  const requiredParams = [
    'franchise_id',
    's_date',
    'b_duration',
    'cabin_type',
    'd_value',
    'id'
  ]

  if (!params) {
    console.error(
      `No search params provided, Please provide these params ${requiredParams.join(
        ', '
      )}`
    )
    return
  }

  let apiPayload = {}
  params = params.replaceAll('^', '&').replaceAll('~', '=')
  params = new URLSearchParams(params)

  const missingParams = requiredParams.filter((param) => !params.has(param))
  if (missingParams.length > 0) {
    console.error(`Missing required parameters: ${missingParams.join(', ')}`)
    return
  } else {
    apiPayload['franchise_id'] = params.get('franchise_id')
    apiPayload['s_date'] = params.get('s_date')
    apiPayload['b_duration'] = params.get('b_duration')
    apiPayload['cabin_type'] = params.get('cabin_type')
    apiPayload['d_value'] = params.get('d_value')
    apiPayload["id"] = params.get("id")
  }

  // Show loading overlay while processing
  loadingOverlay.classList.remove('hidden')

  const horizontalSeats = document.querySelectorAll('.horizontalSeat')
  const verticalSeats = document.querySelectorAll('.verticalSeat')

  function postSeatMessage(seatDiv) {
    console.log(seatDiv)
    window.ReactNativeWebView.postMessage(seatDiv.innerHTML)
    if (seatDiv) {
      window.parent.postMessage(
        {
          seatNumber: seatDiv.innerHTML,
        },
        '*'
      )
    }
  }

  horizontalSeats.forEach((seat) => {
    seat.addEventListener('click', function () {
      if (seat.style.cursor === 'pointer') {
        console.log('Clicked available seat')
        postSeatMessage(seat)
      } else {
        console.log('Seat not available')
      }
    })
  })

  verticalSeats.forEach((seat) => {
    seat.addEventListener('click', function () {
      if (seat.style.cursor === 'pointer') {
        console.log('Clicked available seat')
        postSeatMessage(seat)
      } else {
        console.log('Seat not available')
      }
    })
  })

  let seatsData
  const getCabinLayoutPayload = {
    bookingDuration: apiPayload.b_duration,
    durationValue: apiPayload.d_value,
    franchiseName: apiPayload.franchise_id,
    bookingStartDate: apiPayload.s_date,
    userId: apiPayload.id,
  }

  const cabinType = apiPayload.cabin_type
  try {
    const result = await fetch(
      'https://qa-cmapi.zysk.in/api/bookings/cabin-layout',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(getCabinLayoutPayload),
      }
    )

    const [startDate, endDate] = calculateAndFormatDates(
      getCabinLayoutPayload.bookingStartDate,
      getCabinLayoutPayload.bookingDuration,
      getCabinLayoutPayload.durationValue
    )

    const tempCabins = await fetch(
      `https://qa-cmapi.zysk.in/api/bookings/temp-cabin?franchiseName=${getCabinLayoutPayload.franchiseName}&bookingStartDate=${startDate}&bookingEndDate=${endDate}&cabinType=${cabinType}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    const tempCabinsData = await tempCabins.json()
    const seatIds = tempCabinsData.result.map((cabin) => cabin.seatId)

    const response = await result.json()
    seatsData = response.result

    if (seatsData) {
      processSeatsData(seatsData, seatIds)
    }
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    // Hide loading overlay once processing is done
    loadingOverlay.classList.add('hidden')
  }

  function processSeatsData(seatsData, seatIds) {
    seatsData.forEach((seat) => {
      const seatDiv = document.getElementById(seat.id)
      if (!seatDiv) return

      if (cabinType !== seat.cabintype_name) {
        setupSeat(seatDiv, seat)
        hideSeat(seatDiv)
        return
      }
      if (seatIds.length && seatIds.includes(seat.cabin_name)) {
        setupSeat(seatDiv, seat)
        hideSeat(seatDiv)
        return
      }
      setupSeat(seatDiv, seat)
      seatDiv.addEventListener('click', function () {
        handleSeatSelection(seatDiv, seat)
      })
    })
  }

  function hideSeat(seatDiv) {
    seatDiv.style.backgroundColor = '#eeeeee'
    seatDiv.style.color = 'white'
    seatDiv.style.border = 'none'
    seatDiv.style.cursor = 'not-allowed'
  }

  function setupSeat(seatDiv, seat) {
    seatDiv.classList.add('seat', seat.availability_status)
    seatDiv.style.cursor =
      seat.availability_status === 'available' ? 'pointer' : 'default'
    seatDiv.textContent = seat.cabin_name
  }

  let selectedSeat = null
  function handleSeatSelection(seatDiv, seat) {
    if (seat.availability_status === 'available') {
      if (selectedSeat) {
        selectedSeat.classList.remove('selected')
      }
      if (selectedSeat !== seatDiv) {
        seatDiv.classList.add('selected')
        selectedSeat = seatDiv

        parent.SetFieldValue
          ? parent.SetFieldValue(seatField, seat.cabin_name)
          : null
        parent.UpdateFieldArray
          ? parent.UpdateFieldArray(seatField, '0', seat.cabin_name)
          : null
      } else {
        selectedSeat = null
      }
    }
  }
})
