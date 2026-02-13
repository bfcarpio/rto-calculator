# NagerDateApiReference.PublicHolidayApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**apiV3IsTodayPublicHolidayCountryCodeGet**](PublicHolidayApi.md#apiV3IsTodayPublicHolidayCountryCodeGet) | **GET** /api/v3/IsTodayPublicHoliday/{countryCode} | Determines whether today is a public holiday in the specified country, optionally adjusted by a UTC offset
[**apiV3NextPublicHolidaysCountryCodeGet**](PublicHolidayApi.md#apiV3NextPublicHolidaysCountryCodeGet) | **GET** /api/v3/NextPublicHolidays/{countryCode} | Retrieve all upcoming public holidays occurring within the next 365 days for a given country
[**apiV3NextPublicHolidaysWorldwideGet**](PublicHolidayApi.md#apiV3NextPublicHolidaysWorldwideGet) | **GET** /api/v3/NextPublicHolidaysWorldwide | Retrieve all public holidays occurring worldwide within the next 7 days
[**apiV3PublicHolidaysYearCountryCodeGet**](PublicHolidayApi.md#apiV3PublicHolidaysYearCountryCodeGet) | **GET** /api/v3/PublicHolidays/{year}/{countryCode} | Retrieve the list of all public holidays for the specified year and country



## apiV3IsTodayPublicHolidayCountryCodeGet

> apiV3IsTodayPublicHolidayCountryCodeGet(countryCode, opts)

Determines whether today is a public holiday in the specified country, optionally adjusted by a UTC offset

By default, the calculation is based on the current UTC date. You may optionally provide a timezone offset to evaluate the holiday status relative to a different local timezone.  This endpoint is optimized for simple command-line or automation workflows where only the HTTP status code is required  &#x60;&#x60;&#x60; STATUSCODE&#x3D;$(curl --silent --output /dev/stderr --write-out \&quot;%{http_code}\&quot; https://date.nager.at/Api/v3/IsTodayPublicHoliday/AT) if [ $STATUSCODE -ne 200 ]; then     # handle error fi &#x60;&#x60;&#x60;

### Example

```javascript
import NagerDateApiReference from 'nager_date_api_reference';

let apiInstance = new NagerDateApiReference.PublicHolidayApi();
let countryCode = "'us'"; // String | A valid `ISO 3166-1 alpha-2` country code.
let opts = {
  'countyCode': "countyCode_example", // String | Optional. The subdivision code (e.g., state, province) to narrow the check.
  'offset': 0 // Number | Optional. UTC timezone offset in hours (range: -12 to +12).
};
apiInstance.apiV3IsTodayPublicHolidayCountryCodeGet(countryCode, opts, (error, data, response) => {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully.');
  }
});
```

### Parameters


Name | Type | Description  | Notes
------------- | ------------- | ------------- | -------------
 **countryCode** | **String**| A valid &#x60;ISO 3166-1 alpha-2&#x60; country code. | [default to &#39;us&#39;]
 **countyCode** | **String**| Optional. The subdivision code (e.g., state, province) to narrow the check. | [optional] 
 **offset** | **Number**| Optional. UTC timezone offset in hours (range: -12 to +12). | [optional] [default to 0]

### Return type

null (empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## apiV3NextPublicHolidaysCountryCodeGet

> [PublicHolidayV3Dto] apiV3NextPublicHolidaysCountryCodeGet(countryCode)

Retrieve all upcoming public holidays occurring within the next 365 days for a given country

The list includes only future holidays relative to the current date and is useful for forecasting, event planning, and applications that provide forward-looking holiday insights.

### Example

```javascript
import NagerDateApiReference from 'nager_date_api_reference';

let apiInstance = new NagerDateApiReference.PublicHolidayApi();
let countryCode = "'us'"; // String | A valid `ISO 3166-1 alpha-2` country code.
apiInstance.apiV3NextPublicHolidaysCountryCodeGet(countryCode, (error, data, response) => {
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
 **countryCode** | **String**| A valid &#x60;ISO 3166-1 alpha-2&#x60; country code. | [default to &#39;us&#39;]

### Return type

[**[PublicHolidayV3Dto]**](PublicHolidayV3Dto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## apiV3NextPublicHolidaysWorldwideGet

> [PublicHolidayV3Dto] apiV3NextPublicHolidaysWorldwideGet()

Retrieve all public holidays occurring worldwide within the next 7 days

This global endpoint aggregates upcoming holidays across all supported countries, enabling international systems to detect near-term events.

### Example

```javascript
import NagerDateApiReference from 'nager_date_api_reference';

let apiInstance = new NagerDateApiReference.PublicHolidayApi();
apiInstance.apiV3NextPublicHolidaysWorldwideGet((error, data, response) => {
  if (error) {
    console.error(error);
  } else {
    console.log('API called successfully. Returned data: ' + data);
  }
});
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**[PublicHolidayV3Dto]**](PublicHolidayV3Dto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## apiV3PublicHolidaysYearCountryCodeGet

> [PublicHolidayV3Dto] apiV3PublicHolidaysYearCountryCodeGet(year, countryCode)

Retrieve the list of all public holidays for the specified year and country

This endpoint returns all officially recognized public holidays for the given country and year. Each holiday entry includes the local and English holiday names, information about whether the holiday applies nationally or only in specific subdivisions, and the associated holiday type classifications.

### Example

```javascript
import NagerDateApiReference from 'nager_date_api_reference';

let apiInstance = new NagerDateApiReference.PublicHolidayApi();
let year = 2026; // Number | The target year for which public holidays should be retrieved.
let countryCode = "'us'"; // String | A valid `ISO 3166-1 alpha-2` country code.
apiInstance.apiV3PublicHolidaysYearCountryCodeGet(year, countryCode, (error, data, response) => {
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
 **year** | **Number**| The target year for which public holidays should be retrieved. | [default to 2026]
 **countryCode** | **String**| A valid &#x60;ISO 3166-1 alpha-2&#x60; country code. | [default to &#39;us&#39;]

### Return type

[**[PublicHolidayV3Dto]**](PublicHolidayV3Dto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

