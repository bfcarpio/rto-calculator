# CountryApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**apiV3AvailableCountriesGet**](CountryApi.md#apiv3availablecountriesget) | **GET** /api/v3/AvailableCountries | Retrieve the complete list of all countries supported by the Nager.Date API |
| [**apiV3CountryInfoCountryCodeGet**](CountryApi.md#apiv3countryinfocountrycodeget) | **GET** /api/v3/CountryInfo/{countryCode} | Retrieves detailed information about a specific country |



## apiV3AvailableCountriesGet

> Array&lt;CountryV3Dto&gt; apiV3AvailableCountriesGet()

Retrieve the complete list of all countries supported by the Nager.Date API

This endpoint returns all countries for which public-holiday data is available. Each entry includes the country\&#39;s name and ISO code.

### Example

```ts
import {
  Configuration,
  CountryApi,
} from '';
import type { ApiV3AvailableCountriesGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CountryApi();

  try {
    const data = await api.apiV3AvailableCountriesGet();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**Array&lt;CountryV3Dto&gt;**](CountryV3Dto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successfully returns the list of supported countries. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## apiV3CountryInfoCountryCodeGet

> CountryInfoWithBordersDto apiV3CountryInfoCountryCodeGet(countryCode)

Retrieves detailed information about a specific country

Provide a valid &#x60;ISO 3166-1 alpha-2&#x60; country code to retrieve country metadata. The response includes commonly used and official country names, the assigned region, and if available neighboring countries based on geographical borders.

### Example

```ts
import {
  Configuration,
  CountryApi,
} from '';
import type { ApiV3CountryInfoCountryCodeGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new CountryApi();

  const body = {
    // string | The 2-letter ISO 3166-1 country code (e.g., \"US\", \"GB\").
    countryCode: countryCode_example,
  } satisfies ApiV3CountryInfoCountryCodeGetRequest;

  try {
    const data = await api.apiV3CountryInfoCountryCodeGet(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **countryCode** | `string` | The 2-letter ISO 3166-1 country code (e.g., \&quot;US\&quot;, \&quot;GB\&quot;). | [Defaults to `&#39;us&#39;`] |

### Return type

[**CountryInfoWithBordersDto**](CountryInfoWithBordersDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Returns the requested country information. |  -  |
| **404** | The provided country code is invalid or not recognized. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

