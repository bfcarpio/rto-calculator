
# LongWeekendV3Dto

Represents a long weekend, including optional bridge days.

## Properties

Name | Type
------------ | -------------
`startDate` | Date
`endDate` | Date
`dayCount` | number
`needBridgeDay` | boolean
`bridgeDays` | Array&lt;Date&gt;

## Example

```typescript
import type { LongWeekendV3Dto } from ''

// TODO: Update the object below with actual values
const example = {
  "startDate": null,
  "endDate": null,
  "dayCount": null,
  "needBridgeDay": null,
  "bridgeDays": null,
} satisfies LongWeekendV3Dto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as LongWeekendV3Dto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


