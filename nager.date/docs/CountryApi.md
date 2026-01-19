# NagerDateApiReference.CountryApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**apiV3AvailableCountriesGet**](CountryApi.md#apiV3AvailableCountriesGet) | **GET** /api/v3/AvailableCountries | Retrieve the complete list of all countries supported by the Nager.Date API
[**apiV3CountryInfoCountryCodeGet**](CountryApi.md#apiV3CountryInfoCountryCodeGet) | **GET** /api/v3/CountryInfo/{countryCode} | Retrieves detailed information about a specific country



## apiV3AvailableCountriesGet

> [CountryV3Dto] apiV3AvailableCountriesGet()

Retrieve the complete list of all countries supported by the Nager.Date API

This endpoint returns all countries for which public-holiday data is available. Each entry includes the country&#39;s name and ISO code.

### Example

```javascript
import NagerDateApiReference from 'nager_date_api_reference';

let apiInstance = new NagerDateApiReference.CountryApi();
apiInstance.apiV3AvailableCountriesGet((error, data, response) => {
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

[**[CountryV3Dto]**](CountryV3Dto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json


## apiV3CountryInfoCountryCodeGet

> CountryInfoWithBordersDto apiV3CountryInfoCountryCodeGet(countryCode)

Retrieves detailed information about a specific country

Provide a valid &#x60;ISO 3166-1 alpha-2&#x60; country code to retrieve country metadata. The response includes commonly used and official country names, the assigned region, and if available neighboring countries based on geographical borders.

### Example

```javascript
import NagerDateApiReference from 'nager_date_api_reference';

let apiInstance = new NagerDateApiReference.CountryApi();
let countryCode = "'us'"; // String | The 2-letter ISO 3166-1 country code (e.g., \"US\", \"GB\").
apiInstance.apiV3CountryInfoCountryCodeGet(countryCode, (error, data, response) => {
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
 **countryCode** | **String**| The 2-letter ISO 3166-1 country code (e.g., \&quot;US\&quot;, \&quot;GB\&quot;). | [default to &#39;us&#39;]

### Return type

[**CountryInfoWithBordersDto**](CountryInfoWithBordersDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

