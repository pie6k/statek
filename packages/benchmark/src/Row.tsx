import React, { Component } from 'react';
import { Row, appStore } from './store';
import { useStoreSelector, view } from 'statek';

interface Props {
  row: Row;
}

export const RowComponent = view((props: Props) => {
  const styleClass = props.row.isSelected ? 'danger' : '';

  return (
    <tr className={styleClass}>
      <td className="col-md-1">{props.row.id}</td>
      <td className="col-md-4">
        <a onClick={() => appStore.select(props.row)}>{props.row.label}</a>
      </td>
      <td className="col-md-1">
        <a className="remove" onClick={() => appStore.delete(props.row)}>
          <span
            className="glyphicon glyphicon-remove"
            aria-hidden="true"
          ></span>
        </a>
      </td>
      <td className="col-md-6"></td>
    </tr>
  );
});
