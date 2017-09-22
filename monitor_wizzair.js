#!/usr/bin/env node
"use strict"

const osmosis = require("osmosis");

// fares
const fares = {
    outbound: [],
    return: []
}   

const fetch = () => {
  osmosis
    .get('https://wizzair.com/')
    .config('keep_data', true)
    .config('parse_response', true)
    .post('https://be.wizzair.com/7.2.1/Api/search/search', {
        adultCount			: 1,
        childCount			: 0,
        flightList			: {
        0					: { arrivalStation : 'VAR', departureDate : '2017-09-27', departureStation : 'SOF' },
        1					: { arrivalStation : 'SOF', departureDate : '2017-09-29', departureStation : 'VAR' }
        },
        infantCount			: 0,
        isFlighChange		: false,
        isSeniorOrStudent	: false,
        rescueFareCode		: '',
        wdc					: false
    })
    .then(function(context) {
        var saveFlights = (flights, category) => {
            flights.forEach(function(flight) {
                var departureDateTime = flight.departureDateTime
                flight.fares.forEach(function(fare) {
                    category.push({
                        price: fare.basePrice.amount,
                        bundle: fare.bundle,
                        seats: fare.availableCount,
                        departure: departureDateTime
                    })
                })
            })
        }

        var response = context.response.data
        saveFlights(response.outboundFlights, fares.outbound)
        saveFlights(response.returnFlights, fares.return)
    })
    .done(() => {
        var bestFare = (lhs, rhs) => { return lhs.price < rhs.price ? lhs : rhs }
        var bestOutbound = fares.outbound.reduce(bestFare, Infinity)
        var bestReturn = fares.return.reduce(bestFare, Infinity)
        
        console.log("Best outbound is currently " + bestOutbound.price)
        console.log("Best return is currently " + bestReturn.price)

        fares.outbound = []
        fares.return = []

        setTimeout(fetch, 30*60*1000) // 30 minutes
    })
}

fetch()