[![Dependencies](https://david-dm.org/malpercio/sails-hook-iceline.svg)](https://david-dm.org/malpercio/sails-hook-iceline)
[![DevDependencies](https://david-dm.org/malpercio/sails-hook-iceline/dev-status.svg)](https://david-dm.org/malpercio/sails-hook-iceline)
[![npm version](https://badge.fury.io/js/sails-hook-spore.svg)](https://badge.fury.io/js/sails-hook-spore)

# sails-hook-spore
__________________

A model seeder designed for Sequelize in sails.

## Example

You just need to configure Sails.

```js
//An infinite generator. You can also make them finite. It's up to you.
function* Restaurant(){
  let faker = require('faker');
  let i = 0;
  while(true){
    i++;
    yield {
      model: 'Restaurant',
      data: {
        name: faker.name.firstName(),
        id: i,
      }
    };
  }
}

module.exports.spore = {
  //Catalogs are static entries in your database.
  catalogs: {
    //This is used to prevent the unseed of catalogs
    models: ['TableType'],
    //And most queries follow this schema.
    data:[
      //This is the representation of an instance to create.
      {
        //Model name
        model: 'TableType',
        //Values. If you want to make an association, use its name
        //and indicate the id.
        data: {
          id: 1,
          name: 'Mini',
        },
      },
      {
        model: 'TableType',
        data: {
          id: 2,
          name: 'Pequeña',
        },
      },
      {
        model: 'TableType',
        data: {
          id: 3,
          name: 'Mediana',
        },
      },
      {
        model: 'TableType',
        data: {
          id: 4,
          name: 'Grande',
        },
      },
    ],
  },
  //The function that runs the initial seed. You should import it from somewhere else,
  //but for demostrative purposes, here it's a seed that returns a single Restaurant
  mainGenerator:() => {
    let restaurants = Restaurant();
    return [restaurants.next().value];
  },
  //In case you want to minimize the generators. (Or skip
  // mainGenerator) spore can execute your generator as many times as
  //you'd like. If it's an infinite generator, pass it like in the example
  generators:[
    {
      fx: Restaurant,
      times: 5,
    },
    //If you have a finite generator, you can pass only the reference
    //like so
    RestaurantFiniteGenerator,
  ]
};


```
