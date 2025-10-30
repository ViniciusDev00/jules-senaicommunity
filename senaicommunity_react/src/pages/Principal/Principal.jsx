import React, { useContext } from 'react';
import AuthContext from '../../contexts/Auth/AuthContext';

// Componentes do Layout
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';
import MainContent from './MainContent';
import RightSidebar from './RightSidebar';

// CSS
import './Principal.css';

const Principal = () => {
    const { user: currentUser } = useContext(AuthContext);

    return (
        <div>
            <Topbar />
            <div className="container">
                <Sidebar currentUser={currentUser} />
                <MainContent currentUser={currentUser} />
                <RightSidebar />
            </div>
        </div>
    );
};

export default Principal;