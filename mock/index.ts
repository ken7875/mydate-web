import { MockMethod } from 'vite-plugin-mock';

export default [
  {
    url: '/group',
    method: 'get',
    response: () => ({
      status: 'success',
      code: 200,
      message: 'success',
      data: [
        {
          id: '123456',
          name: 'test group',
          member: ['a', 'b', 'c'],
          memberNums: 12
        },
        {
          id: '789',
          name: 'test group2',
          member: ['d', 'e', 'f'],
          memberNums: 5
        }
      ]
    })
  }
] as MockMethod[];
