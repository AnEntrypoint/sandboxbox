import React, { useState } from 'react';

interface CounterProps {
  initialValue?: number;
  step?: number;
}

const Counter: React.FC<CounterProps> = ({ initialValue = 0, step = 1 }) => {
  const [count, setCount] = useState<number>(initialValue);

  const increment = () => {
    setCount(prevCount => prevCount + step);
  };

  const decrement = () => {
    setCount(prevCount => prevCount - step);
  };

  return (
    <div className="counter">
      <h2>Counter</h2>
      <p>Count: {count}</p>
      <div className="counter-controls">
        <button onClick={decrement} aria-label="Decrement">
          -
        </button>
        <button onClick={increment} aria-label="Increment">
          +
        </button>
      </div>
    </div>
  );
};

export default Counter;