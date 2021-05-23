import { Fixture } from '../Fixture'

export const typeOfFixtures: Fixture[] = [
  {
    description: 'typeof name',
    input: 'typeof A',
    expected: {
      type: 'JsdocTypeTypeof',
      element: {
        type: 'JsdocTypeName',
        value: 'A',
        meta: {
          reservedWord: false
        }
      }
    },
    modes: ['typescript', 'closure'],
    catharsis: {
      closure: 'fail',
      jsdoc: 'fail'
    }, // NOTE: This seems to be a Catharsis error
    jtp: {
      closure: 'closure',
      jsdoc: 'fail',
      typescript: 'typescript',
      permissive: 'closure'
    }
  },
  {
    description: 'typeof',
    input: 'typeof',
    modes: [],
    catharsis: {
      closure: 'differ',
      jsdoc: 'differ'
    },
    jtp: {
      closure: 'differ',
      jsdoc: 'differ',
      typescript: 'differ',
      permissive: 'differ'
    }
  },
  {
    description: 'generic with typeof',
    input: 'X<typeof>',
    modes: [],
    catharsis: {
      closure: 'differ',
      jsdoc: 'differ'
    },
    jtp: {
      closure: 'differ',
      jsdoc: 'differ',
      typescript: 'differ',
      permissive: 'differ'
    }
  },
  {
    description: 'generic with typeof name',
    input: 'X<typeof A>',
    expected: {
      type: 'JsdocTypeGeneric',
      left: {
        type: 'JsdocTypeName',
        value: 'X',
        meta: {
          reservedWord: false
        }
      },
      elements: [{
        type: 'JsdocTypeTypeof',
        element: {
          type: 'JsdocTypeName',
          value: 'A',
          meta: {
            reservedWord: false
          }
        }
      }],
      meta: {
        dot: false,
        brackets: '<>'
      }
    },
    modes: ['typescript', 'closure'],
    catharsis: {
      closure: 'fail',
      jsdoc: 'fail'
    },
    jtp: {
      closure: 'closure',
      jsdoc: 'fail',
      typescript: 'typescript',
      permissive: 'typescript'
    }
  },
  // {
  //   description: 'generic typeof name in parenthesis',
  //   input: '(typeof X)<A>',
  //   expected: {
  //     type: 'JsdocTypeGeneric',
  //     left: {
  //       type: 'JsdocTypeTypeof',
  //       element: {
  //         type: 'JsdocTypeName',
  //         value: 'X',
  //         meta: {
  //           reservedWord: false
  //         }
  //       }
  //     },
  //     elements: [
  //       {
  //         type: 'JsdocTypeName',
  //         value: 'A',
  //         meta: {
  //           reservedWord: false
  //         }
  //       }
  //     ],
  //     meta: {
  //       dot: false,
  //       brackets: '<>'
  //     }
  //   },
  //   modes: ['typescript'],
  //   catharsis: {
  //     closure: 'fail',
  //     jsdoc: 'fail'
  //   },
  //   jtp: {
  //     closure: 'fail',
  //     jsdoc: 'fail',
  //     typescript: 'typescript',
  //     permissive: 'typescript'
  //   }
  // },
  {
    description: 'typeof name in parenthesis',
    input: '(typeof A)',
    expected: {
      type: 'JsdocTypeParenthesis',
      element: {
        type: 'JsdocTypeTypeof',
        element: {
          type: 'JsdocTypeName',
          value: 'A',
          meta: {
            reservedWord: false
          }
        }
      }
    },
    modes: ['typescript', 'closure'],
    catharsis: {
      closure: 'fail', // this seems to be a catharsis error
      jsdoc: 'fail'
    },
    jtp: {
      closure: 'closure',
      jsdoc: 'fail',
      typescript: 'typescript',
      permissive: 'typescript'
    }
  },
  {
    description: 'repeatable typeof name',
    input: '...typeof A',
    expected: {
      type: 'JsdocTypeVariadic',
      element: {
        type: 'JsdocTypeTypeof',
        element: {
          type: 'JsdocTypeName',
          value: 'A',
          meta: {
            reservedWord: false
          }
        }
      },
      meta: {
        squareBrackets: false,
        position: 'PREFIX'
      }
    },
    modes: ['closure', 'typescript'],
    catharsis: {
      closure: 'fail',
      jsdoc: 'fail'
    },
    jtp: {
      closure: 'closure',
      jsdoc: 'fail',
      typescript: 'typescript',
      permissive: 'typescript'
    }
  },
  {
    description: 'postfix repeatable typeof name',
    input: 'typeof A...',
    expected: {
      type: 'JsdocTypeVariadic',
      element: {
        type: 'JsdocTypeTypeof',
        element: {
          type: 'JsdocTypeName',
          value: 'A',
          meta: {
            reservedWord: false
          }
        }
      },
      meta: {
        squareBrackets: false,
        position: 'SUFFIX'
      }
    },
    modes: [],
    catharsis: {
      closure: 'fail',
      jsdoc: 'fail'
    },
    jtp: {
      closure: 'differ',
      jsdoc: 'fail',
      typescript: 'differ',
      permissive: 'differ'
    } // NOTE: This seems to be a JTP error
  },
  {
    description: 'union typeof name',
    input: 'typeof A | number',
    expected: {
      type: 'JsdocTypeUnion',
      elements: [
        {
          type: 'JsdocTypeTypeof',
          element: {
            type: 'JsdocTypeName',
            value: 'A',
            meta: {
              reservedWord: false
            }
          }
        },
        {
          type: 'JsdocTypeName',
          value: 'number',
          meta: {
            reservedWord: false
          }
        }
      ]
    },
    modes: ['typescript', 'closure'],
    catharsis: {
      closure: 'fail',
      jsdoc: 'fail'
    },
    jtp: {
      closure: 'closure',
      jsdoc: 'fail',
      typescript: 'typescript',
      permissive: 'typescript'
    }
  },
  {
    description: 'union with typeof name',
    input: 'number | typeof A',
    expected: {
      type: 'JsdocTypeUnion',
      elements: [
        {
          type: 'JsdocTypeName',
          value: 'number',
          meta: {
            reservedWord: false
          }
        },
        {
          type: 'JsdocTypeTypeof',
          element: {
            type: 'JsdocTypeName',
            value: 'A',
            meta: {
              reservedWord: false
            }
          }
        }
      ]
    },
    modes: ['typescript', 'closure'],
    catharsis: {
      closure: 'fail',
      jsdoc: 'fail'
    },
    jtp: {
      closure: 'closure',
      jsdoc: 'fail',
      typescript: 'typescript',
      permissive: 'typescript'
    }
  },
  {
    description: 'typeof array',
    input: 'typeof N[]',
    expected: {
      type: 'JsdocTypeTypeof',
      element: {
        type: 'JsdocTypeGeneric',
        left: {
          type: 'JsdocTypeName',
          value: 'Array',
          meta: {
            reservedWord: false
          }
        },
        elements: [
          {
            type: 'JsdocTypeName',
            value: 'N',
            meta: {
              reservedWord: false
            }
          }
        ],
        meta: {
          dot: false,
          brackets: '[]'
        }
      }
    },
    modes: ['typescript'],
    catharsis: {
      closure: 'fail',
      jsdoc: 'fail'
    },
    jtp: {
      closure: 'fail',
      jsdoc: 'fail',
      typescript: 'differ',
      permissive: 'differ'
    }
  },
  {
    description: 'typeof as function parameter without return type should fail',
    input: 'function(typeof A)',
    expected: {
      type: 'JsdocTypeFunction',
      parameters: [
        {
          type: 'JsdocTypeTypeof',
          element: {
            type: 'JsdocTypeName',
            value: 'A',
            meta: {
              reservedWord: false
            }
          }
        }
      ],
      arrow: false,
      parenthesis: true
    },
    modes: ['closure'],
    catharsis: {
      closure: 'fail', // this seems to be a catharsis error
      jsdoc: 'fail'
    },
    jtp: {
      closure: 'closure',
      jsdoc: 'fail',
      typescript: 'differ',
      permissive: 'differ'
    }
  },
  {
    description: 'typeof as function parameter',
    input: 'function(typeof A): void',
    expected: {
      type: 'JsdocTypeFunction',
      parameters: [
        {
          type: 'JsdocTypeTypeof',
          element: {
            type: 'JsdocTypeName',
            value: 'A',
            meta: {
              reservedWord: false
            }
          }
        }
      ],
      returnType: {
        type: 'JsdocTypeName',
        value: 'void',
        meta: {
          reservedWord: true
        }
      },
      arrow: false,
      parenthesis: true
    },
    modes: ['typescript', 'closure'],
    catharsis: {
      closure: 'fail',
      jsdoc: 'fail'
    },
    jtp: {
      closure: 'closure',
      jsdoc: 'fail',
      typescript: 'typescript',
      permissive: 'typescript'
    }
  },
  {
    description: 'typeof as first function parameter',
    input: 'function(typeof A, number): void',
    expected: {
      type: 'JsdocTypeFunction',
      parameters: [
        {
          type: 'JsdocTypeTypeof',
          element: {
            type: 'JsdocTypeName',
            value: 'A',
            meta: {
              reservedWord: false
            }
          }
        },
        {
          type: 'JsdocTypeName',
          value: 'number',
          meta: {
            reservedWord: false
          }
        }
      ],
      returnType: {
        type: 'JsdocTypeName',
        value: 'void',
        meta: {
          reservedWord: true
        }
      },
      arrow: false,
      parenthesis: true
    },
    modes: ['typescript', 'closure'],
    catharsis: {
      closure: 'fail', // this seems to be a catharsis error
      jsdoc: 'fail'
    },
    jtp: {
      closure: 'closure',
      jsdoc: 'fail',
      typescript: 'typescript',
      permissive: 'typescript'
    }
  },
  {
    description: 'typeof as second function parameter',
    input: 'function(number, typeof A): void',
    expected: {
      type: 'JsdocTypeFunction',
      parameters: [
        {
          type: 'JsdocTypeName',
          value: 'number',
          meta: {
            reservedWord: false
          }
        },
        {
          type: 'JsdocTypeTypeof',
          element: {
            type: 'JsdocTypeName',
            value: 'A',
            meta: {
              reservedWord: false
            }
          }
        }
      ],
      returnType: {
        type: 'JsdocTypeName',
        value: 'void',
        meta: {
          reservedWord: true
        }
      },
      arrow: false,
      parenthesis: true
    },
    modes: ['typescript', 'closure'],
    catharsis: {
      closure: 'fail', // this seems to be a catharsis error
      jsdoc: 'fail'
    },
    jtp: {
      closure: 'closure',
      jsdoc: 'fail',
      typescript: 'typescript',
      permissive: 'typescript'
    }
  },
  {
    description: 'typeof as return of function',
    input: 'function(): typeof A',
    expected: {
      type: 'JsdocTypeFunction',
      parameters: [],
      returnType: {
        type: 'JsdocTypeTypeof',
        element: {
          type: 'JsdocTypeName',
          value: 'A',
          meta: {
            reservedWord: false
          }
        }
      },
      arrow: false,
      parenthesis: true
    },
    modes: ['typescript', 'closure'],
    catharsis: {
      closure: 'fail', // this seems to be a catharsis error
      jsdoc: 'fail'
    },
    jtp: {
      closure: 'closure',
      jsdoc: 'fail',
      typescript: 'typescript',
      permissive: 'typescript'
    }
  }
]
