import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsNotSameCurrency(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotSameCurrency',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: validationOptions ?? {
        message: 'fromCurrency and toCurrency must be different',
      },
      validator: {
        validate(value: string, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints as string[];
          const relatedValue = (args.object as Record<string, string>)[
            relatedPropertyName
          ];
          return value !== relatedValue;
        },
      },
    });
  };
}
