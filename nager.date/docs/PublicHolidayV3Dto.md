# NagerDateApiReference.PublicHolidayV3Dto

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**date** | **Date** | The date of the holiday. | 
**localName** | **String** | Local name of the holiday. | 
**name** | **String** | English name of the holiday. | 
**countryCode** | **String** | ISO 3166-1 alpha-2 country code. | 
**fixed** | **Boolean** | Indicates if this holiday occurs on the same date every year. | [optional] 
**global** | **Boolean** | Indicates if this holiday applies to the entire country. | [optional] 
**counties** | **[String]** | ISO-3166-2 codes of the subdivisions where this holiday applies | [optional] 
**launchYear** | **Number** | The year the holiday was first observed. | [optional] 
**types** | [**[HolidayTypes]**](HolidayTypes.md) | List of holiday types this holiday is classified under. | 


