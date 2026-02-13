# NagerDateApiReference.LongWeekendApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**apiV3LongWeekendYearCountryCodeGet**](LongWeekendApi.md#apiV3LongWeekendYearCountryCodeGet) | **GET** /api/v3/LongWeekend/{year}/{countryCode} | Retrieve all long weekends for a given country and year



## apiV3LongWeekendYearCountryCodeGet

> [LongWeekendV3Dto] apiV3LongWeekendYearCountryCodeGet(year, countryCode, opts)

Retrieve all long weekends for a given country and year

A long weekend is calculated based on public holidays that create an extended break of at least three consecutive days. Optional bridge days-weekdays between a holiday and a weekend-can be included to identify potential extended leave opportunities.

### Example

```javascript
import NagerDateApiReference from 'nager_date_api_reference';

let apiInstance = new NagerDateApiReference.LongWeekendApi();
let year = 2026; // Number | The target year for which long-weekend data should be calculated.
let countryCode = "'us'"; // String | A valid `ISO 3166-1 alpha-2` country code determining the region of interest.
let opts = {
  'availableBridgeDays': 1, // Number | The maximum number of bridge days to include when determining long-weekend opportunities.
  'subdivisionCode': "subdivisionCode_example" // String | Narrow the calculation to a specific federal state, province, or subdivision (where supported).
};
apiInstance.apiV3LongWeekendYearCountryCodeGet(year, countryCode, opts, (error, data, response) => {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
});
```

### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **year** | **Number**| The target year for which long-weekend data should be calculated. | [default to 2026]
 **countryCode** | **String**| A valid &#x60;ISO 3166-1 alpha-2&#x60; country code determining the region of interest. | [default to &#39;us&#39;]
 **availableBridgeDays** | **Number**| The maximum number of bridge days to include when determining long-weekend opportunities. | [optional] [default to 1]
 **subdivisionCode** | **String**| Narrow the calculation to a specific federal state, province, or subdivision (where supported). | [optional] 

### Return type

[**[LongWeekendV3Dto]**](LongWeekendV3Dto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

