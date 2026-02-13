# VersionApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**apiV3VersionGet**](VersionApi.md#apiv3versionget) | **GET** /api/v3/Version | Retrieve the current version information of the Nager.Date library |



## apiV3VersionGet

> VersionInfoDto apiV3VersionGet()

Retrieve the current version information of the Nager.Date library

This endpoint returns detailed version information about the Nager.Date implementation running on the server, including the exact NuGet package version used by the API.

### Example

```ts
import {
  Configuration,
  VersionApi,
} from '';
import type { ApiV3VersionGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new VersionApi();

  try {
    const data = await api.apiV3VersionGet();
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

[**VersionInfoDto**](VersionInfoDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successfully retrieved version information. |  -  |
| **500** | An unexpected server error occurred. |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

