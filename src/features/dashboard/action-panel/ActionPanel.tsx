import plusIcon from '../../../assets/plus-icon.png';
import './ActionPanel.css';

export function ActionPanel() {

  return (
    <div className="action-panel-container">
      <button className="action-panel-button">
        <img src={plusIcon} alt="plus" className="action-panel-button-icon" />
      </button>
      <button className="action-panel-button"></button>
      <button className="action-panel-button"></button>
    </div>
  );
}