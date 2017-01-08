#!/usr/bin/env node
"use strict"

const osmosis = require("osmosis");

osmosis
  .get('https://www.air.bg/')
  .submit("//form[@id='amadeus_book']", {
  	/*depart*/B_LOCATION_1:  "SOF",
  	/*dest*/E_LOCATION_1:  "VAR",
  	TRIP_TYPE:  "R" /*round trip*/,
  	/*from*/B_DATE_1:  "201704140000",
  	/*from +/-*/DATE_RANGE_VALUE_1:  0,
	/*to +/-*/DATE_RANGE_VALUE_2:  0,
  	/*to*/B_DATE_2:  "201704170000",
  	CABIN:  "E" /*Economic*/,
  	/*adults*/ADTPAX:  1
  })
  .log(console.log)
  .error(console.log)
  .debug(console.log)

// osmosis
//   .get('www.craigslist.org/about/sites')
//   .find('h1 + div a')
//   .set('location')
//   .data(function(data) {
//     console.log(data);
//   });