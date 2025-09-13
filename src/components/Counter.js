import React, { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1);
  };

  const decrement = () => {
    setCount(count - 1);
  };

  const reset = () => {
    setCount(0);
  };

  return (
    <div style={{ textAlign: 'center', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <h2>Counter</h2>
      <div style={{ fontSize: '48px', margin: '20px 0', fontWeight: 'bold' }}>
        {count}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={decrement}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          -
        </button>
        <button
          onClick={reset}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#666666',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Reset
        </button>
        <button
          onClick={increment}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: '#44ff44',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default Counter;