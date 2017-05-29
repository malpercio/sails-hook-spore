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
  catalogs: { //Catalogs
    models: ['TableType'],
    data:[
      {
        model: 'TableType',
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
  // mainGenerator:() => { //The function that runs the initial seed.
  //   let restaurants = Restaurant();
  //   return [restaurants.next().value];
  // },
  generators:[ //In case you want to minimize the generators. (Or skip mainGenerator)
    {
      fx: Restaurant,
      times: 5,
    }
  ]
};
