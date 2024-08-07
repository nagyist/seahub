import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../utils/utils';

const propTypes = {
  currentItem: PropTypes.object,
  onItemClick: PropTypes.func.isRequired,
  onSearchedItemDoubleClick: PropTypes.func.isRequired,
  item: PropTypes.object,
};

class SearchedListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
    };
  }

  onMouseEnter = () => {
    this.setState({ highlight: true });
  };

  onMouseLeave = () => {
    this.setState({ highlight: false });
  };

  onClick = () => {
    let item = this.props.item;
    this.props.onItemClick(item);
  };

  searchItemDoubleClick = (e) => {
    let item = this.props.item;

    this.props.onSearchedItemDoubleClick(item);
  };

  render() {
    let { item, currentItem } = this.props;
    let folderIconUrl = item.link_content ? Utils.getFolderIconUrl(false, 192) : Utils.getDefaultLibIconUrl(false);
    let fileIconUrl = item.is_dir ? folderIconUrl : Utils.getFileIconUrl(item.name);
    return (
      <tr
        className={classnames('searched-list-item', {
          'tr-highlight': this.state.highlight,
          'tr-active': currentItem && item.repo_id === currentItem.repo_id && item.path === currentItem.path
        })}
        onClick={this.onClick}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onDoubleClick={this.searchItemDoubleClick}
      >
        <td className="text-center">
          <img className="item-img" src={fileIconUrl} alt="" width="24"/>
        </td>
        <td>
          <span className="item-link">{item.repo_name}/{item.link_content}</span>
        </td>
      </tr>
    );
  }
}

SearchedListItem.propTypes = propTypes;

export default SearchedListItem;
