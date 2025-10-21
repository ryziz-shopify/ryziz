import React, { useState, useCallback } from 'react';
import {
  Page, Layout, Card, Button, ButtonGroup, TextField, Select,
  Checkbox, RadioButton, Stack, Badge, Banner, List, TextStyle, Text,
  DataTable, ResourceList, ResourceItem, Thumbnail, EmptyState,
  Modal, Toast, Frame, FormLayout, ChoiceList, RangeSlider, Tag,
  Tabs, CalloutCard, DescriptionList, Divider
} from '@shopify/polaris';

// Demo data
const DEMO_PRODUCTS = [
  { id: '1', name: 'Product 1', price: '$29.99', status: 'active', image: 'https://via.placeholder.com/50' },
  { id: '2', name: 'Product 2', price: '$49.99', status: 'draft', image: 'https://via.placeholder.com/50' },
  { id: '3', name: 'Product 3', price: '$19.99', status: 'active', image: 'https://via.placeholder.com/50' }
];

const TABLE_ROWS = [
  ['Product A', '100', '$2,999', 'Active'],
  ['Product B', '50', '$1,499', 'Draft'],
  ['Product C', '200', '$4,999', 'Active']
];

const TAB_CONFIG = [
  { id: 'tab1', content: 'Components', panelID: 'panel1' },
  { id: 'tab2', content: 'Forms', panelID: 'panel2' },
  { id: 'tab3', content: 'Data', panelID: 'panel3' }
];

const SELECT_OPTIONS = [
  { label: 'Option 1', value: 'option1' },
  { label: 'Option 2', value: 'option2' },
  { label: 'Option 3', value: 'option3' }
];

export async function head() {
  return {
    title: 'Polaris Components Demo',
    description: 'Showcase of all Polaris components'
  };
}

export default function Demo() {
  const [textValue, setTextValue] = useState('');
  const [selectValue, setSelectValue] = useState('option1');
  const [checked, setChecked] = useState(false);
  const [radioValue, setRadioValue] = useState('option1');
  const [rangeValue, setRangeValue] = useState(50);
  const [selectedTab, setSelectedTab] = useState(0);
  const [modalActive, setModalActive] = useState(false);
  const [toastActive, setToastActive] = useState(false);

  const handleTextChange = useCallback((value) => setTextValue(value), []);
  const handleSelectChange = useCallback((value) => setSelectValue(value), []);
  const handleCheckboxChange = useCallback((value) => setChecked(value), []);
  const handleRadioChange = useCallback((value) => setRadioValue(value), []);
  const toggleModal = useCallback(() => setModalActive(!modalActive), [modalActive]);
  const toggleToast = useCallback(() => setToastActive(!toastActive), [toastActive]);

  const toastMarkup = toastActive ? (
    <Toast content="Changes saved!" onDismiss={toggleToast} />
  ) : null;

  return (
    <Frame>
      <Page
        title="Polaris Components Demo"
        subtitle="Explore all available Polaris components"
        primaryAction={{ content: 'Primary Action', onAction: toggleToast }}
        secondaryActions={[
          { content: 'Secondary', onAction: () => {} },
          { content: 'Another Action', onAction: () => {} }
        ]}
      >
        <Layout>
          <Layout.Section>
            <Banner title="Welcome to Polaris Demo!" status="info">
              <p>This page showcases various Polaris components you can use in your app.</p>
            </Banner>
          </Layout.Section>

          <Layout.Section>
            <Card>
              <Tabs tabs={TAB_CONFIG} selected={selectedTab} onSelect={setSelectedTab}>
                {selectedTab === 0 && (
                  <Card.Section>
                    <Layout>
                      <Layout.Section oneHalf>
                        <Card title="Badges" sectioned>
                          <Stack spacing="tight">
                            <Badge>Default</Badge>
                            <Badge status="success">Success</Badge>
                            <Badge status="info">Info</Badge>
                            <Badge status="attention">Attention</Badge>
                            <Badge status="warning">Warning</Badge>
                            <Badge status="critical">Critical</Badge>
                          </Stack>
                        </Card>
                      </Layout.Section>

                      <Layout.Section oneHalf>
                        <Card title="Buttons" sectioned>
                          <Stack vertical spacing="tight">
                            <Button primary>Primary Button</Button>
                            <Button>Default Button</Button>
                            <Button destructive>Destructive Button</Button>
                            <Button outline>Outline Button</Button>
                            <Button plain>Plain Button</Button>
                            <ButtonGroup>
                              <Button>Left</Button>
                              <Button>Center</Button>
                              <Button>Right</Button>
                            </ButtonGroup>
                          </Stack>
                        </Card>
                      </Layout.Section>

                      <Layout.Section oneHalf>
                        <Card title="Tags" sectioned>
                          <Stack spacing="tight">
                            <Tag>Default Tag</Tag>
                            <Tag onRemove={() => {}}>Removable</Tag>
                            <Tag url="/app/products">Link Tag</Tag>
                          </Stack>
                        </Card>
                      </Layout.Section>

                      <Layout.Section oneHalf>
                        <CalloutCard
                          title="Feature Highlight"
                          illustration="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
                          primaryAction={{ content: 'Learn more', url: '#' }}
                        >
                          <p>Discover powerful features to grow your business.</p>
                        </CalloutCard>
                      </Layout.Section>
                    </Layout>
                  </Card.Section>
                )}

                {selectedTab === 1 && (
                  <Card.Section>
                    <Layout>
                      <Layout.Section oneHalf>
                        <Card title="Form Controls" sectioned>
                          <FormLayout>
                            <TextField
                              label="Text Input"
                              value={textValue}
                              onChange={handleTextChange}
                              placeholder="Enter text here"
                              helpText="This is help text for the field"
                            />

                            <Select
                              label="Select"
                              options={SELECT_OPTIONS}
                              value={selectValue}
                              onChange={handleSelectChange}
                            />

                            <Checkbox
                              label="Checkbox option"
                              checked={checked}
                              onChange={handleCheckboxChange}
                            />

                            <Stack vertical>
                              <RadioButton
                                label="Radio Option 1"
                                checked={radioValue === 'option1'}
                                id="radio1"
                                onChange={() => handleRadioChange('option1')}
                              />
                              <RadioButton
                                label="Radio Option 2"
                                checked={radioValue === 'option2'}
                                id="radio2"
                                onChange={() => handleRadioChange('option2')}
                              />
                            </Stack>

                            <RangeSlider
                              label="Range Slider"
                              value={rangeValue}
                              onChange={setRangeValue}
                              output
                            />
                          </FormLayout>
                        </Card>
                      </Layout.Section>

                      <Layout.Section oneHalf>
                        <Card title="Lists" sectioned>
                          <Text variant="headingMd" as="h3">Simple List</Text>
                          <List type="bullet">
                            <List.Item>First item</List.Item>
                            <List.Item>Second item</List.Item>
                            <List.Item>Third item</List.Item>
                          </List>

                          <Divider />

                          <Text variant="headingMd" as="h3">Numbered List</Text>
                          <List type="number">
                            <List.Item>Step one</List.Item>
                            <List.Item>Step two</List.Item>
                            <List.Item>Step three</List.Item>
                          </List>

                          <Divider />

                          <DescriptionList
                            items={[
                              { term: 'Total Products', description: '150 items' },
                              { term: 'Revenue', description: '$12,450' },
                              { term: 'Status', description: 'Active' }
                            ]}
                          />
                        </Card>
                      </Layout.Section>
                    </Layout>
                  </Card.Section>
                )}

                {selectedTab === 2 && (
                  <Card.Section>
                    <Layout>
                      <Layout.Section>
                        <Card title="Data Table" sectioned>
                          <DataTable
                            columnContentTypes={['text', 'numeric', 'numeric', 'text']}
                            headings={['Product', 'Quantity', 'Price', 'Status']}
                            rows={TABLE_ROWS}
                            totals={['', '350', '$9,447', '']}
                          />
                        </Card>
                      </Layout.Section>

                      <Layout.Section>
                        <Card title="Resource List">
                          <ResourceList
                            resourceName={{ singular: 'product', plural: 'products' }}
                            items={DEMO_PRODUCTS}
                            renderItem={renderProductItem}
                          />
                        </Card>
                      </Layout.Section>
                    </Layout>
                  </Card.Section>
                )}
              </Tabs>
            </Card>
          </Layout.Section>

          <Layout.Section oneHalf>
            <Card title="Modal Demo" sectioned>
              <Button onClick={toggleModal}>Open Modal</Button>
              <Modal
                open={modalActive}
                onClose={toggleModal}
                title="Example Modal"
                primaryAction={{
                  content: 'Save',
                  onAction: () => {
                    toggleModal();
                    toggleToast();
                  }
                }}
                secondaryActions={[{ content: 'Cancel', onAction: toggleModal }]}
              >
                <Modal.Section>
                  <Stack vertical>
                    <Text variant="bodyMd" as="p">
                      This is a modal dialog. You can add any content here.
                    </Text>
                    <TextField
                      label="Name"
                      placeholder="Enter name"
                      autoComplete="off"
                    />
                  </Stack>
                </Modal.Section>
              </Modal>
            </Card>
          </Layout.Section>

          <Layout.Section oneHalf>
            <Card sectioned>
              <EmptyState
                heading="No products yet"
                action={{ content: 'Add product', onAction: () => {} }}
                secondaryAction={{ content: 'Learn more', url: '#' }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>Track and manage your products with ease.</p>
              </EmptyState>
            </Card>
          </Layout.Section>

          <Layout.Section>
            <Stack vertical>
              <Banner status="success" title="Success Banner">
                Your changes have been saved successfully.
              </Banner>
              <Banner status="warning" title="Warning Banner">
                Please review these items before continuing.
              </Banner>
              <Banner status="critical" title="Critical Banner">
                There was an error processing your request.
              </Banner>
            </Stack>
          </Layout.Section>

          <Layout.Section>
            <Layout>
              <Layout.Section oneThird>
                <Card sectioned>
                  <div style={{ textAlign: 'center' }}>
                    <Text variant="heading2xl" as="p">150</Text>
                    <Text variant="bodyMd" as="p" tone="subdued">
                      Total Products
                    </Text>
                  </div>
                </Card>
              </Layout.Section>
              <Layout.Section oneThird>
                <Card sectioned>
                  <div style={{ textAlign: 'center' }}>
                    <Text variant="heading2xl" as="p">$12,450</Text>
                    <Text variant="bodyMd" as="p" tone="subdued">
                      Revenue
                    </Text>
                  </div>
                </Card>
              </Layout.Section>
              <Layout.Section oneThird>
                <Card sectioned>
                  <div style={{ textAlign: 'center' }}>
                    <Text variant="heading2xl" as="p">98%</Text>
                    <Text variant="bodyMd" as="p" tone="subdued">
                      Customer Satisfaction
                    </Text>
                  </div>
                </Card>
              </Layout.Section>
            </Layout>
          </Layout.Section>
        </Layout>

        {toastMarkup}
      </Page>
    </Frame>
  );
}

/**
 * Render product item in resource list
 */
function renderProductItem(item) {
  const { id, name, price, status, image } = item;
  const media = <Thumbnail source={image} alt={name} />;

  return (
    <ResourceItem
      id={id}
      media={media}
      accessibilityLabel={`View details for ${name}`}
    >
      <Text variant="bodyMd" fontWeight="bold" as="h3">
        {name}
      </Text>
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        <Badge status={status === 'active' ? 'success' : 'warning'}>
          {status}
        </Badge>
        <Text variant="bodySm" as="span">
          {price}
        </Text>
      </div>
    </ResourceItem>
  );
}
