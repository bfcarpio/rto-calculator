# PublicHolidayApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**apiV3IsTodayPublicHolidayCountryCodeGet**](PublicHolidayApi.md#apiv3istodaypublicholidaycountrycodeget) | **GET** /api/v3/IsTodayPublicHoliday/{countryCode} | Determines whether today is a public holiday in the specified country, optionally adjusted by a UTC offset |
| [**apiV3NextPublicHolidaysCountryCodeGet**](PublicHolidayApi.md#apiv3nextpublicholidayscountrycodeget) | **GET** /api/v3/NextPublicHolidays/{countryCode} | Retrieve all upcoming public holidays occurring within the next 365 days for a given country |
| [**apiV3NextPublicHolidaysWorldwideGet**](PublicHolidayApi.md#apiv3nextpublicholidaysworldwideget) | **GET** /api/v3/NextPublicHolidaysWorldwide | Retrieve all public holidays occurring worldwide within the next 7 days |
| [**apiV3PublicHolidaysYearCountryCodeGet**](PublicHolidayApi.md#apiv3publicholidaysyearcountrycodeget) | **GET** /api/v3/PublicHolidays/{year}/{countryCode} | Retrieve the list of all public holidays for the specified year and country |



## apiV3IsTodayPublicHolidayCountryCodeGet

> apiV3IsTodayPublicHolidayCountryCodeGet(countryCode, countyCode, offset)

Determines whether today is a public holiday in the specified country, optionally adjusted by a UTC offset

By default, the calculation is based on the current UTC date. You may optionally provide a timezone offset to evaluate the holiday status relative to a different local timezone.  This endpoint is optimized for simple command-line or automation workflows where only the HTTP status code is required  &#x60;&#x60;&#x60; STATUSCODE&#x3D;$(curl --silent --output /dev/stderr --write-out \&quot;%{http_code}\&quot; https://date.nager.at/Api/v3/IsTodayPublicHoliday/AT) if [ $STATUSCODE -ne 200 ]; then     # handle error fi &#x60;&#x60;&#x60;

### Example

```ts
import {
  Configuration,
  PublicHolidayApi,
} from '';
import type { ApiV3IsTodayPublicHolidayCountryCodeGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new PublicHolidayApi();

  const body = {
    // string | A valid `ISO 3166-1 alpha-2` country code.
    countryCode: countryCode_example,
    // string | Optional. The subdivision code (e.g., state, province) to narrow the check. (optional)
    countyCode: countyCode_example,
    // number | Optional. UTC timezone offset in hours (range: -12 to +12). (optional)
    offset: 56,
  } satisfies ApiV3IsTodayPublicHolidayCountryCodeGetRequest;

  try {
    const data = await api.apiV3IsTodayPublicHolidayCountryCodeGet(body);
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
| **countryCode** | `string` | A valid &#x60;ISO 3166-1 alpha-2&#x60; country code. | [Defaults to `&#39;us&#39;`] |
| **countyCode** | `string` | Optional. The subdivision code (e.g., state, province) to narrow the check. | [Optional] [Defaults to `undefined`] |
| **offset** | `number` | Optional. UTC timezone offset in hours (range: -12 to +12). | [Optional] [Defaults to `0`] |

### Return type

`void` (Empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Today is a public holiday |  -  |
| **204** | Today is not a public holiday |  -  |
| **404** | The provided country code is invalid or not recognized. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## apiV3NextPublicHolidaysCountryCodeGet

> Array&lt;PublicHolidayV3Dto&gt; apiV3NextPublicHolidaysCountryCodeGet(countryCode)

Retrieve all upcoming public holidays occurring within the next 365 days for a given country

The list includes only future holidays relative to the current date and is useful for forecasting, event planning, and applications that provide forward-looking holiday insights.

### Example

```ts
import {
  Configuration,
  PublicHolidayApi,
} from '';
import type { ApiV3NextPublicHolidaysCountryCodeGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new PublicHolidayApi();

  const body = {
    // string | A valid `ISO 3166-1 alpha-2` country code.
    countryCode: countryCode_example,
  } satisfies ApiV3NextPublicHolidaysCountryCodeGetRequest;

  try {
    const data = await api.apiV3NextPublicHolidaysCountryCodeGet(body);
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
| **countryCode** | `string` | A valid &#x60;ISO 3166-1 alpha-2&#x60; country code. | [Defaults to `&#39;us&#39;`] |

### Return type

[**Array&lt;PublicHolidayV3Dto&gt;**](PublicHolidayV3Dto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | A list of upcoming public holidays for the next 365 days. |  -  |
| **204** | No upcoming holidays were found for the specified country. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## apiV3NextPublicHolidaysWorldwideGet

> Array&lt;PublicHolidayV3Dto&gt; apiV3NextPublicHolidaysWorldwideGet()

Retrieve all public holidays occurring worldwide within the next 7 days

This global endpoint aggregates upcoming holidays across all supported countries, enabling international systems to detect near-term events.

### Example

```ts
import {
  Configuration,
  PublicHolidayApi,
} from '';
import type { ApiV3NextPublicHolidaysWorldwideGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new PublicHolidayApi();

  try {
    const data = await api.apiV3NextPublicHolidaysWorldwideGet();
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

[**Array&lt;PublicHolidayV3Dto&gt;**](PublicHolidayV3Dto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | A collection of upcoming global public holidays. |  -  |
| **204** | No upcoming holidays were found. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## apiV3PublicHolidaysYearCountryCodeGet

> Array&lt;PublicHolidayV3Dto&gt; apiV3PublicHolidaysYearCountryCodeGet(year, countryCode)

Retrieve the list of all public holidays for the specified year and country

This endpoint returns all officially recognized public holidays for the given country and year. Each holiday entry includes the local and English holiday names, information about whether the holiday applies nationally or only in specific subdivisions, and the associated holiday type classifications.

### Example

```ts
import {
  Configuration,
  PublicHolidayApi,
} from '';
import type { ApiV3PublicHolidaysYearCountryCodeGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new PublicHolidayApi();

  const body = {
    // number | The target year for which public holidays should be retrieved.
    year: 56,
    // string | A valid `ISO 3166-1 alpha-2` country code.
    countryCode: countryCode_example,
  } satisfies ApiV3PublicHolidaysYearCountryCodeGetRequest;

  try {
    const data = await api.apiV3PublicHolidaysYearCountryCodeGet(body);
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
| **year** | `number` | The target year for which public holidays should be retrieved. | [Defaults to `2026`] |
| **countryCode** | `string` | A valid &#x60;ISO 3166-1 alpha-2&#x60; country code. | [Defaults to `&#39;us&#39;`] |

### Return type

[**Array&lt;PublicHolidayV3Dto&gt;**](PublicHolidayV3Dto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successfully retrieved the list of public holidays. |  -  |
| **400** | The request was invalid. See the validation details for more information. |  -  |
| **404** | The provided country code is invalid or not recognized. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

