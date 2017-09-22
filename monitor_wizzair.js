#!/usr/bin/env node
"use strict"

const osmosis = require("osmosis")
const chalk = require("chalk")
const rainbow = require("chalk-rainbow")
const blessed = require("blessed")
const contrib = require("blessed-contrib")
const format = require("date-format")
const pretty = require("pretty-ms")
const airports = require("airports")

// fares
var prevBestOutbound = { price: 0 }
var prevBestReturn = { price: 0 }
const fares = {
    outbound: [],
    return: []
}

// command line options
var originAirport // e.g. SOF
var destinationAirport // e.g. VAR
var outboundDate // e.g. 2017-09-27
var returnDate // e.g. 2017-09-27
var passengers
var interval = 30 // in minutes

process.argv.forEach((arg, i, argv) => {
  switch (arg) {
    case "--from":
      originAirport = argv[i + 1]
      break
    case "--to":
      destinationAirport = argv[i + 1]
      break
    case "--leave-date":
      outboundDate = argv[i + 1]
      break
    case "--return-date":
      returnDate = argv[i + 1]
      break
    case "--passengers":
      passengers = argv[i + 1]
      break
    case "--interval":
      interval = argv[i + 1]
      break
  }
})

// renderer
class Dashboard {
    constructor() {
      this.markers = []
      this.widgets = {}

      // Configure blessed
      this.screen = blessed.screen({
        title: "WizzAir Dashboard",
        autoPadding: true,
        dockBorders: true,
        fullUnicode: true,
        smartCSR: true
      })

      this.screen.key(["escape", "q", "C-c"], (ch, key) => process.exit(0))

      // Grid settings
      this.grid = new contrib.grid({
        screen: this.screen,
        rows: 12,
        cols: 12
      })

      // Graphs
      this.graphs = {
        outbound: {
          title: "Origin",
          x: [],
          y: [],
          style: {
            line: "red"
          }
        },
        return: {
          title: "Destination",
          x: [],
          y: [],
          style: {
            line: "yellow"
          }
        }
      }

      // Shared settings
      const shared = {
        border: {
          type: "line"
        },
        style: {
          fg: "white",
          text: "white",
          border: {
            fg: "green"
          }
        }
      }

      // Widgets
      const widgets = {
        map: {
          type: contrib.map,
          size: {
            width: 9,
            height: 5,
            top: 0,
            left: 0
          },
          options: Object.assign({}, shared, {
            label: "Map"
            // startLon: 54,
            // endLon: 110,
            // startLat: 112,
            // endLat: 140,
            // region: "us",
            // labelSpace: 1
          })
        },
        settings: {
          type: contrib.log,
          size: {
            width: 3,
            height: 5,
            top: 0,
            left: 9
          },
          options: Object.assign({}, shared, {
            label: "Settings",
            padding: {
              left: 1
            }
          })
        },
        graph: {
          type: contrib.line,
          size: {
            width: 12,
            height: 4,
            top: 5,
            left: 0
          },
          options: Object.assign({}, shared, {
            label: "Prices",
            showLegend: true,
            legend: {
              width: 20
            }
          })
        },
        log: {
          type: contrib.log,
          size: {
            width: 12,
            height: 3,
            top: 9,
            left: 0
          },
          options: Object.assign({}, shared, {
            label: "Log",
            padding: {
              left: 1
            }
          })
        }
      }

      for (let name in widgets) {
        let widget = widgets[name]

        this.widgets[name] = this.grid.set(
          widget.size.top,
          widget.size.left,
          widget.size.height,
          widget.size.width,
          widget.type,
          widget.options
        )
      }
    }

    render() {
      this.screen.render()
    }

    plot(prices) {
      const now = format("dd/MM/yy-hh:mm:ss", new Date())

      Object.assign(this.graphs.outbound, {
        x: [...this.graphs.outbound.x, now],
        y: [...this.graphs.outbound.y, prices.outbound]
      })

      Object.assign(this.graphs.return, {
        x: [...this.graphs.return.x, now],
        y: [...this.graphs.return.y, prices.return]
      })

      this.widgets.graph.setData([
        this.graphs.outbound,
        this.graphs.return
      ])
    }

    waypoint(data) {
      this.markers.push(data)

      if (this.blink) {
        return
      }

      // Blink effect
      var visible = true

      this.blink = setInterval(() => {
        if (visible) {
          this.markers.forEach((m) => this.widgets.map.addMarker(m))
        } else {
          this.widgets.map.clearMarkers()
        }

        visible = !visible

        this.render()
      }, 1000) // 1s
    }

    log(messages) {
      const now = format("dd/MM/yy-hh:mm:ss", new Date())
      messages.forEach((m) => this.widgets.log.log(`${now}: ${m}`))
    }

    settings(config) {
      config.forEach((c) => this.widgets.settings.add(c))
    }
  }

const dashboard = new Dashboard()

const fetch = () => {
  osmosis
    .get('https://wizzair.com/')
    .config('keep_data', true)
    .config('parse_response', true)
    .post('https://be.wizzair.com/7.2.1/Api/search/search', {
        adultCount        : passengers,
        childCount        : 0,
        flightList        : {
          0               : { arrivalStation : destinationAirport, departureDate : outboundDate, departureStation : originAirport },
          1               : { arrivalStation : originAirport, departureDate : returnDate, departureStation : destinationAirport }
        },
        infantCount       : 0,
        isFlighChange     : false,
        isSeniorOrStudent : false,
        rescueFareCode    : '',
        wdc               : false
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
        const bestOutbound = fares.outbound.reduce(bestFare, Infinity)
        const bestReturn = fares.return.reduce(bestFare, Infinity)

        fares.outbound = []
        fares.return = []

        var getFareDiffString = (fareDiff) => {
          var fareDiffString = ""
          if ( fareDiff > 0 )
            fareDiffString = chalk.green(`(down ${fareDiff})`)
          else if ( fareDiff < 0 )
            fareDiffString = chalk.red(`(up ${-fareDiff})`)
          else
            fareDiffString = chalk.white(`(no change)`)

          return fareDiffString
        }

        const outboundFareDiff = prevBestOutbound.price - bestOutbound.price
        const outboundFareDiffString = getFareDiffString(outboundFareDiff)
        prevBestOutbound = bestOutbound

        const returnFareDiff = prevBestReturn.price - bestReturn.price
        const returnFareDiffString = getFareDiffString(returnFareDiff)
        prevBestReturn = bestReturn

        dashboard.log([
          `Lowest fares for an outbound flight is currently ${[bestOutbound.price, outboundFareDiffString].filter(i => i).join(" ")}`,
          `Lowest fares for a return flight is currently ${[bestReturn.price, returnFareDiffString].filter(i => i).join(" ")}`
        ])

        dashboard.plot({
          outbound: bestOutbound.price,
          return: bestReturn.price
        })

        setTimeout(fetch, interval*60*1000) // `interval` minutes
    })
}

airports.forEach((airport) => {
  switch (airport.iata) {
    case originAirport:
      dashboard.waypoint({ lat: airport.lat, lon: airport.lon, color: 'red', char: 'X' })
      break
    case destinationAirport:
      dashboard.waypoint({ lat: airport.lat, lon: airport.lon, color: 'yellow', char: 'X' })
      break
  }
})

dashboard.settings([
  `Origin airport: ${originAirport}`,
  `Destination airport: ${destinationAirport}`,
  `Outbound date: ${outboundDate}`,
  `Return date: ${returnDate}`,
  `Passengers: ${passengers}`,
  `Interval: ${interval}min`
])

fetch()