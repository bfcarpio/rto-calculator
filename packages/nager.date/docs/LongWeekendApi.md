# LongWeekendApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**apiV3LongWeekendYearCountryCodeGet**](LongWeekendApi.md#apiv3longweekendyearcountrycodeget) | **GET** /api/v3/LongWeekend/{year}/{countryCode} | Retrieve all long weekends for a given country and year |



## apiV3LongWeekendYearCountryCodeGet

> Array&lt;LongWeekendV3Dto&gt; apiV3LongWeekendYearCountryCodeGet(year, countryCode, availableBridgeDays, subdivisionCode)

Retrieve all long weekends for a given country and year

A long weekend is calculated based on public holidays that create an extended break of at least three consecutive days. Optional bridge days-weekdays between a holiday and a weekend-can be included to identify potential extended leave opportunities.

### Example

```ts
import {
  Configuration,
  LongWeekendApi,
} from '';
import type { ApiV3LongWeekendYearCountryCodeGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new LongWeekendApi();

  const body = {
    // number | The target year for which long-weekend data should be calculated.
    year: 56,
    // string | A valid `ISO 3166-1 alpha-2` country code determining the region of interest.
    countryCode: countryCode_example,
    // number | The maximum number of bridge days to include when determining long-weekend opportunities. (optional)
    availableBridgeDays: 56,
    // string | Narrow the calculation to a specific federal state, province, or subdivision (where supported). (optional)
    subdivisionCode: subdivisionCode_example,
  } satisfies ApiV3LongWeekendYearCountryCodeGetRequest;

  try {
    const data = await api.apiV3LongWeekendYearCountryCodeGet(body);
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
| **year** | `number` | The target year for which long-weekend data should be calculated. | [Defaults to `2026`] |
| **countryCode** | `string` | A valid &#x60;ISO 3166-1 alpha-2&#x60; country code determining the region of interest. | [Defaults to `&#39;us&#39;`] |
| **availableBridgeDays** | `number` | The maximum number of bridge days to include when determining long-weekend opportunities. | [Optional] [Defaults to `1`] |
| **subdivisionCode** | `string` | Narrow the calculation to a specific federal state, province, or subdivision (where supported). | [Optional] [Defaults to `undefined`] |

### Return type

[**Array&lt;LongWeekendV3Dto&gt;**](LongWeekendV3Dto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successfully returns the calculated long-weekend results for the specified country and year. |  -  |
| **404** | The provided country code is invalid or not recognized. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

