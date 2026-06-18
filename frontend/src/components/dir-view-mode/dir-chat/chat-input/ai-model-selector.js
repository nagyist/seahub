import React from 'react';
import PropTypes from 'prop-types';
import { SINGLE_LLM_MODEL } from '../constants';

const AIModelSelector = ({ selectedModel, updateModel }) => {
  const value = selectedModel || SINGLE_LLM_MODEL.model;

  return (
    <select
      className="form-control form-control-sm"
      value={value}
      onChange={(event) => updateModel(event.target.value)}
    >
      <option value={SINGLE_LLM_MODEL.model}>{SINGLE_LLM_MODEL.label}</option>
    </select>
  );
};

AIModelSelector.propTypes = {
  selectedModel: PropTypes.string,
  updateModel: PropTypes.func.isRequired,
};

export default AIModelSelector;
