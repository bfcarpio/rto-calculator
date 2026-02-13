
# CountryInfoDto

Detailed information about a country.

## Properties

Name | Type
------------ | -------------
`commonName` | string
`officialName` | string
`countryCode` | string
`region` | string

## Example

```typescript
import type { CountryInfoDto } from ''

// TODO: Update the object below with actual values
const example = {
  "commonName": null,
  "officialName": null,
  "countryCode": null,
  "region": null,
} satisfies CountryInfoDto

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as CountryInfoDto
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


