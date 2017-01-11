#!/usr/bin/env node
"use strict"

// fares
const fares = {
	outbound: [],
	return: []
}

const Nightmare = require('nightmare');
const nightmare = Nightmare();

nightmare
  .goto('https://www.air.bg/')
  .insert('#B_LOCATION_1', 'SOF')
  .insert('#E_LOCATION_1', 'VAR')
  .insert('#B_DATE_1', '201704140000')
  .insert('#DATE_RANGE_VALUE_1', 0)
  .insert('#B_DATE_2', '201704170000')
  .insert('#DATE_RANGE_VALUE_2', 0)
  .click('[value="Търси"]')
  .wait('#availability-bound-0')
  .evaluate(function() {

  })

// nightmare
//   .goto('http://delta.com')
//   .insert('#originCity',[originAirport])
//   .insert('#destinationCity', [destinationAirport])
//   .insert('#departureDate', [outboundDateString])
//   .insert('#returnDate', [returnDateString])
//   .insert('#paxCount', [adultPassengerCount])
//   .click('#findFlightsSubmit')
//   .wait('.priceBfrDec')
//   .evaluate(function () {
//     return document.querySelector('.priceBfrDec').innerHTML;
//   })
//   .end()
//   .then(function (result) {
//     console.log(result);
//   })
//   .catch(function (error) {
//     console.error('Search failed:', error);
//   });