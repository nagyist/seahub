import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../../utils/constants';

const propTypes = {
  currentItem: PropTypes.string.isRequired
};

class OrgsNav extends React.Component {

  constructor(props) {
    super(props);
    this.navItems = [
      { name: 'organizations', urlPart: 'organizations', text: gettext('All') },
      { name: 'traffic-exceeded', urlPart: 'organizations/traffic-exceeded', text: gettext('Traffic exceeded') },
    ];
  }

  render() {
    const { currentItem } = this.props;
    return (
      <div className="cur-view-path tab-nav-container">
        <ul className="nav">
          {this.navItems.map((item, index) => {
            return (
              <li className="nav-item" key={index}>
                <Link to={`${siteRoot}sys/${item.urlPart}/`} className={`nav-link${currentItem == item.name ? ' active' : ''}`}>{item.text}</Link>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
}

OrgsNav.propTypes = propTypes;

export default OrgsNav;
