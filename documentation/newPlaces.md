## Supported Google APIs - Places API (New)

### [Place class](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place)

| [Static Methods](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place-Static-Methods) | Supported          | Notes                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| [searchByText](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.searchByText)     | :white_check_mark: | `SearchByTextRequest` input options are [limited](#searchbytextrequest-interface). `Place` reponse properties are [limited](#place-properties). |
| [searchNearby](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.searchNearby)     | :white_check_mark: | `SearchNearbyRequest` input options are [limited](#searchnearbyrequest-interface). `Place` reponse properties are [limited](#place-properties). |

| [Methods](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place-Methods)                       | Supported          | Notes                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------- |
| [fetchFields](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.fetchFields)               | :white_check_mark: | `Place` properties are limited, noted below |
| [getNextOpeningTime](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.getNextOpeningTime) | :x:                |                                             |
| [isOpen](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.isOpen)                         | :x:                |                                             |
| [toJSON](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.toJSON)                         | :white_check_mark: |                                             |

### [Place properties](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place-Properties)

| [Properties](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place-Properties)                                                 | Supported          | Notes |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| [accessibilityOptions](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.accessibilityOptions)                             | :x:                |       |
| [addressComponents](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.addressComponents)                                   | :white_check_mark: |       |
| [adrFormatAddress](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.adrFormatAddress)                                     | :white_check_mark: |       |
| [allowsDogs](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.allowsDogs)                                                 | :x:                |       |
| [attributions](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.attributions)                                             | :x:                |       |
| [businessStatus](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.businessStatus)                                         | :x:                |       |
| [displayName](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.displayName)                                               | :white_check_mark: |       |
| [displayNameLanguageCode](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.displayNameLanguageCode)                       | :x:                |       |
| [editorialSummary](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.editorialSummary)                                     | :x:                |       |
| [editorialSummaryLanguageCode](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.editorialSummaryLanguageCode)             | :x:                |       |
| [evChargeOptions](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.evChargeOptions)                                       | :x:                |       |
| [formattedAddress](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.formattedAddress)                                     | :white_check_mark: |       |
| [fuelOptions](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.fuelOptions)                                               | :x:                |       |
| [googleMapsURI](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.googleMapsURI)                                           | :x:                |       |
| [hasCurbsidePickup](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.hasCurbsidePickup)                                   | :x:                |       |
| [hasDelivery](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.hasDelivery)                                               | :x:                |       |
| [hasDineIn](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.hasDineIn)                                                   | :x:                |       |
| [hasLiveMusic](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.hasLiveMusic)                                             | :x:                |       |
| [hasMenuForChildren](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.hasMenuForChildren)                                 | :x:                |       |
| [hasOutdoorSeating](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.hasOutdoorSeating)                                   | :x:                |       |
| [hasRestroom](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.hasRestroom)                                               | :x:                |       |
| [hasTakeout](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.hasTakeout)                                                 | :x:                |       |
| [hasWiFi](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.hasWiFi)                                                       | :x:                |       |
| [iconBackgroundColor](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.iconBackgroundColor)                               | :x:                |       |
| [id](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.id)                                                                 | :white_check_mark: |       |
| [internationalPhoneNumber](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.internationalPhoneNumber)                     | :white_check_mark: |       |
| [isGoodForChildren](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.isGoodForChildren)                                   | :x:                |       |
| [isGoodForGroups](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.isGoodForGroups)                                       | :x:                |       |
| [isGoodForWatchingSports](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.isGoodForWatchingSports)                       | :x:                |       |
| [isReservable](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.isReservable)                                             | :x:                |       |
| [location](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.location)                                                     | :white_check_mark: |       |
| [nationalPhoneNumber](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.nationalPhoneNumber)                               | :white_check_mark: |       |
| [parkingOptions](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.parkingOptions)                                         | :x:                |       |
| [paymentOptions](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.paymentOptions)                                         | :x:                |       |
| [photos](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.photos)                                                         | :x:                |       |
| [plusCode](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.plusCode)                                                     | :white_check_mark: |       |
| [priceLevel](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.priceLevel)                                                 | :x:                |       |
| [primaryType](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.primaryType)                                               | :x:                |       |
| [primaryTypeDisplayName](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.primaryTypeDisplayName)                         | :x:                |       |
| [primaryTypeDisplayNameLanguageCode](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.primaryTypeDisplayNameLanguageCode) | :x:                |       |
| [rating](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.rating)                                                         | :x:                |       |
| [regularOpeningHours](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.regularOpeningHours)                               | :white_check_mark: |       |
| [requestedLanguage](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.requestedLanguage)                                   | :white_check_mark: |       |
| [requestedRegion](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.requestedRegion)                                       | :x:                |       |
| [reviews](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.reviews)                                                       | :x:                |       |
| [servesBeer](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.servesBeer)                                                 | :x:                |       |
| [servesBreakfast](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.servesBreakfast)                                       | :x:                |       |
| [servesBrunch](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.servesBrunch)                                             | :x:                |       |
| [servesCocktails](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.servesCocktails)                                       | :x:                |       |
| [servesCoffee](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.servesCoffee)                                             | :x:                |       |
| [servesDessert](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.servesDessert)                                           | :x:                |       |
| [servesDinner](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.servesDinner)                                             | :x:                |       |
| [servesLunch](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.servesLunch)                                               | :x:                |       |
| [servesVegetarianFood](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.servesVegetarianFood)                             | :x:                |       |
| [servesWine](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.servesWine)                                                 | :x:                |       |
| [svgIconMaskURI](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.svgIconMaskURI)                                         | :x:                |       |
| [types](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.types)                                                           | :white_check_mark: |       |
| [userRatingCount](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.userRatingCount)                                       | :x:                |       |
| [utcOffsetMinutes](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.utcOffsetMinutes)                                     | :white_check_mark: |       |
| [viewport](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.viewport)                                                     | :white_check_mark: |       |
| [websiteURI](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.websiteURI)                                                 | :white_check_mark: |       |
| [openingHours](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#Place.openingHours)                                             | :white_check_mark: |       |

### [SearchByTextRequest interface](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest)

| [Properties](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest-Properties)                         | Supported          | Notes |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| [evSearchOptions](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.evSearchOptions)               | :x:                |       |
| [fields](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.fields)                                 | :white_check_mark: |       |
| [includedType](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.includedType)                     | :x:                |       |
| [isOpenNow](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.isOpenNow)                           | :x:                |       |
| [language](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.language)                             | :white_check_mark: |       |
| [locationBias](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.locationBias)                     | :white_check_mark: |       |
| [locationRestriction](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.locationRestriction)       | :white_check_mark: |       |
| [maxResultCount](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.maxResultCount)                 | :white_check_mark: |       |
| [minRating](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.minRating)                           | :x:                |       |
| [priceLevels](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.priceLevels)                       | :x:                |       |
| [query](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.query)                                   | :white_check_mark: |       |
| [rankBy](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.rankBy)                                 | :x:                |       |
| [rankPreference](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.rankPreference)                 | :x:                |       |
| [region](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.region)                                 | :white_check_mark: |       |
| [textQuery](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.textQuery)                           | :white_check_mark: |       |
| [useStrictTypeFiltering](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchByTextRequest.useStrictTypeFiltering) | :x:                |       |

### [SearchNearbyRequest interface](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchNearbyRequest)

| [Properties](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchNearbyRequest-Properties)                     | Supported          | Notes |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----- |
| [locationRestriction](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchNearbyRequest.locationRestriction)   | :white_check_mark: |       |
| [excludedPrimaryTypes](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchNearbyRequest.excludedPrimaryTypes) | :x:                |       |
| [excludedTypes](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchNearbyRequest.excludedTypes)               | :white_check_mark: |       |
| [fields](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchNearbyRequest.fields)                             | :white_check_mark: |       |
| [includedPrimaryTypes](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchNearbyRequest.includedPrimaryTypes) | :x:                |       |
| [includedTypes](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchNearbyRequest.includedTypes)               | :white_check_mark: |       |
| [language](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchNearbyRequest.language)                         | :white_check_mark: |       |
| [maxResultCount](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchNearbyRequest.maxResultCount)             | :white_check_mark: |       |
| [rankPreference](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchNearbyRequest.rankPreference)             | :x:                |       |
| [region](https://developers-dot-devsite-v2-prod.appspot.com/maps/documentation/javascript/reference/place#SearchNearbyRequest.region)                             | :white_check_mark: |       |
