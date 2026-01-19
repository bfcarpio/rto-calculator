# NagerDateApiReference.VersionApi

All URIs are relative to *http://localhost*

Method | HTTP request | Description
------------- | ------------- | -------------
[**apiV3VersionGet**](VersionApi.md#apiV3VersionGet) | **GET** /api/v3/Version | Retrieve the current version information of the Nager.Date library



## apiV3VersionGet

> VersionInfoDto apiV3VersionGet()

Retrieve the current version information of the Nager.Date library

This endpoint returns detailed version information about the Nager.Date implementation running on the server, including the exact NuGet package version used by the API.

### Example

```javascript
import NagerDateApiReference from 'nager_date_api_reference';

let apiInstance = new NagerDateApiReference.VersionApi();
apiInstance.apiV3VersionGet((error, data, response) => {
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

[**VersionInfoDto**](VersionInfoDto.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: application/json

