const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function find(array, value) {
  for (let i = 0; i < array.length; i++) {
    if (array[i] === value) {
      return true;
    }
  }
  return false;
}

find(array, 5);
