
# PublicHolidayV3Dto

Represents a public holiday.

## Properties

Name | Type
------------ | -------------
`date` | Date
`localName` | string
`name` | string
`countryCode` | string
`fixed` | boolean
`global` | boolean
`counties` | Array&lt;string&gt;
`launchYear` | number
`types` | [Array&lt;HolidayTypes&gt;](HolidayTypes.md)

## Example

```typescript
import type { PublicHolidayV3Dto } from ''

// TODO: Update the object below with actual values
const example = {
  "date": null,
  "localName": null,
  "name": null,
  "countryCode": null,
  "fixed": null,
  "global": null,
  "counties": null,
  "launchYear": null,
  "types": null,
} satisfies PublicHolidayV3Dto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PublicHolidayV3Dto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


