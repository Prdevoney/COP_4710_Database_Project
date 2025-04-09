import React, { useState } from 'react';
import { Container, Tabs, Tab } from 'react-bootstrap';
import EventsList from '../components/EventsList';
import RSOsList from '../components/RSOsList';

const Events: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('events');

  return (
    <Container className="mt-4">
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k || 'events')}
        className="mb-4"
      >
        <Tab eventKey="events" title="Events">
          <EventsList />
        </Tab>
        <Tab eventKey="rsos" title="RSOs">
          <RSOsList />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Events;