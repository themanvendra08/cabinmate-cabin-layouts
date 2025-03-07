const franchiseName = parent.GetFieldValue('frn_name000F1')
const bookingStartDate = parent.GetFieldValue('booking_start_date000F1')
const bookingDuration = parent.GetFieldValue('booking_duration000F1')
const durationValue = parent.GetFieldValue('duration_value000F1')
const cabinType = parent.GetFieldValue('cabin_type000F1')
const id = parent.GetFieldValue('user_id000F1')
console.log('id: ', id);
let seatField = parent.GetFieldId
  ? parent.GetFieldId('seat_no', '000', '1')
  : null

let seatsData
const result = AxCallSqlDataAPI('AXPKEY000000010034', {
  s_date: bookingStartDate,
  b_duration: bookingDuration,
  d_value: durationValue,
  franchise_id: franchiseName,
  userid: id,
})

const response = JSON.parse(result)
console.log(response['bookingApi'].rows)
seatsData = response['bookingApi'].rows
if (seatsData) {
  processSeatsData(seatsData)
}

let selectedSeat = null
let isSeatSelected = false
function processSeatsData(seatsData) {
  seatsData.forEach((seat) => {
    const seatDiv = document.getElementById(seat.id)
    if (cabinType !== seat.cabintype_name) {
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
  seatDiv.style.textContent = ''
}

function setupSeat(seatDiv, seat) {
  seatDiv.classList.add('seat', seat.availability_status)
  seatDiv.style.cursor =
    seat.availability_status === 'available' ? 'pointer' : 'default'
  seatDiv.textContent = seat.cabin_name
}

function handleSeatSelection(seatDiv, seat) {
  if (seat.availability_status === 'available') {
    if (selectedSeat) {
      selectedSeat.classList.remove('selected')
    }
    if (selectedSeat !== seatDiv) {
      seatDiv.classList.add('selected')
      selectedSeat = seatDiv
      isSeatSelected = true

      parent.SetFieldValue
        ? parent.SetFieldValue(seatField, seat.cabin_name)
        : null
      parent.UpdateFieldArray
        ? parent.UpdateFieldArray(seatField, '0', seat.cabin_name)
        : null
    } else {
      selectedSeat = null
      isSeatSelected = false
    }
  }
}


// <script type="text/javascript" src="../../cabinmate/HTMLPages/js/layout.js?v=1730965694092"></script>