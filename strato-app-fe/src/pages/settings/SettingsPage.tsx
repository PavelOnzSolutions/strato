import React, {useEffect, useState} from 'react';
import {
  useTheme,
  AccentColor,
  accentColors,
  DefaultFont,
  CodeFont,
  BackgroundType,
  ElementEdgeRadius
} from '../../context/ThemeContext';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import {Card, Flex, Text, Heading, Select, Grid, Box, Separator, Button, Tabs} from '@radix-ui/themes';
import {
  Moon,
  Sun,
  Monitor,
  Palette,
  Languages,
  Type,
  Code,
  Settings,
  Save,
  SunMoon,
  PaintBucket,
  BookType,
  Globe, Image, ArrowBigLeft, Bell, SquareRoundCorner, Flame, CircleCheck, CircleX
} from 'lucide-react';
import {useAuth} from "../../context/AuthContext.tsx";
import {usePageTitle} from "../../context/PageTitleContext.tsx";

const SettingsPage: React.FC = () => {
  const {user} = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('ui');
  const {
    appearance,
    setAppearance,
    accentColor,
    setAccentColor,
    backgroundType,
    setBackgroundType,
    radiusType,
    setRadiusType,
    defaultFont,
    setDefaultFont,
    codeFont,
    setCodeFont,
    saveConfiguration
  } = useTheme();
  const {t, i18n} = useTranslation();

  const defaultFonts: DefaultFont[] = ['Federo', 'Poppins', 'Sansation', 'Space Grotesk', 'Titillium Web'];
  const codeFonts: CodeFont[] = ['Fira Code', 'Syne Mono', 'Space Mono'];
  const backgrounds: BackgroundType[] = ['orbs', 'mesh', 'waves', 'particles', 'plasma', 'starfield', 'forest'];
  const radiusTypes: ElementEdgeRadius[] = ['none', 'small', 'medium', 'large', 'full'];

  const handleSave = async () => {
    if (user?.username) {
      setIsSaving(true);
      try {
        await saveConfiguration(user.username);
        navigate(-1);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  usePageTitle("User Settings");

  useEffect(() => {
    // Optionally, trigger save on every change, but explicitly provided save button is safer for bulk changes
  }, [appearance, accentColor, defaultFont, codeFont, i18n.language]);

  return (
    <Box p="4">
      <Flex direction="column" gap="6" maxWidth="800px" mx="auto">
        <header>
          <Flex justify="between" align="center" mb="2">
            <Heading size="6">
              <Flex align="center" gap="2">
                <Settings size={32} color="var(--accent-9)"></Settings>
                <span
                  className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
                  {t('head_user_settings', 'User Settings')}
                </span>
              </Flex>
            </Heading>
            <Flex direction="row" gap="2">
              <Button onClick={handleCancel} variant="soft" color="amber">
                <ArrowBigLeft size={16}/> {t('btn_back', 'Back')}
              </Button>
              <Button onClick={handleSave}  color="green" loading={isSaving}>
                <Save size={16}/> {t('btn_save_changes', 'Save Changes')}
              </Button>
            </Flex>
          </Flex>
          <Text color="gray"
                size="2">{t('sub_user_settings', 'Manage your interface preferences and application settings.')}</Text>
        </header>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List size="2" mb="4">
            <Tabs.Trigger value="ui">
              <Flex gap="2" align="center">
                <Palette size={14}/>
                {t('tab_ui_visuals', 'UI & Visuals')}
              </Flex>
            </Tabs.Trigger>
            <Tabs.Trigger value="notifications">
              <Flex gap="2" align="center">
                <Bell size={14}/>
                {t('tab_notifications', 'Notifications')}
              </Flex>
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="ui">
            <Flex direction="column" gap="6">
              <Card size="3">
                <Flex direction="column" gap="4">
                  <Flex direction="row" gap="2">
                    <PaintBucket size={24} color="var(--accent-9)"></PaintBucket>
                    <Heading size="5" mb="2">
                <span
                  className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
                  {t('title_settings_appearance', 'Appearance')}
                </span>
                    </Heading>
                  </Flex>
                  <Grid columns="2" gap="4" align="center">
                    <Flex align="center" gap="3">
                      <SunMoon size={20} className="text-[var(--gray-11)]"/>
                      <Box>
                        <Text as="div" size="2" weight="bold">{t('lbl_theme_mode', 'Theme Mode')}</Text>
                        <Text as="div" size="1"
                              color="gray">{t('lbl_theme_mode_desc', 'Choose your preferred color theme')}</Text>
                      </Box>
                    </Flex>
                    <Select.Root value={appearance} onValueChange={(val) => setAppearance(val as any)}>
                      <Select.Trigger/>
                      <Select.Content>
                        <Select.Item value="auto">
                          <Flex align="center" gap="2">
                            <Monitor size={14}/> {t('item_theme_mode_auto', 'Auto (System)')}
                          </Flex>
                        </Select.Item>
                        <Select.Item value="light">
                          <Flex align="center" gap="2">
                            <Sun size={14}/> {t('item_theme_mode_light', 'Light')}
                          </Flex>
                        </Select.Item>
                        <Select.Item value="dark">
                          <Flex align="center" gap="2">
                            <Moon size={14}/> {t('item_theme_mode_dark', 'Dark')}
                          </Flex>
                        </Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </Grid>

                  <Separator size="4"/>

                  <Grid columns="2" gap="4" align="center">
                    <Flex align="center" gap="3">
                      <Palette size={20} className="text-[var(--gray-11)]"/>
                      <Box>

                        <Text as="div" size="2" weight="bold">{t('lbl_accent_color', 'Accent Color')}</Text>
                        <Text as="div" size="1"
                              color="gray">{t('lbl_accent_color_desc', 'The primary color used for buttons and highlights')}</Text>
                      </Box>
                    </Flex>
                    <Select.Root value={accentColor} onValueChange={(val) => setAccentColor(val as AccentColor)}>
                      <Select.Trigger/>
                      <Select.Content>
                        {(accentColors as AccentColor[]).map(color => (
                          <Select.Item key={color} value={color}>
                            <Flex align="center" gap="2">
                              <div className="w-3 h-3 rounded-full"
                                   style={{backgroundColor: `var(--${color}-9`}}/>
                              {t(`colors_${color}`, color.charAt(0).toUpperCase() + color.slice(1))}
                            </Flex>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Grid>

                  <Separator size="4"/>

                  <Grid columns="2" gap="4" align="center">
                    <Flex align="center" gap="3">
                      <Image size={20} className="text-[var(--gray-11)]"/>
                      <Box>

                        <Text as="div" size="2" weight="bold">{t('lbl_background', 'Background')}</Text>
                        <Text as="div" size="1"
                              color="gray">{t('lbl_background_desc', 'Your application background style')}</Text>
                      </Box>
                    </Flex>
                    <Select.Root value={backgroundType}
                                 onValueChange={(val) => setBackgroundType(val as BackgroundType)}>
                      <Select.Trigger/>
                      <Select.Content>
                        {(backgrounds as BackgroundType[]).map(background => (
                          <Select.Item key={background} value={background}>
                            {background.charAt(0).toUpperCase() + background.slice(1)}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Grid>

                  <Separator size="4"/>

                  <Grid columns="2" gap="4" align="center">
                    <Flex align="center" gap="3">
                      <SquareRoundCorner size={20} className="text-[var(--gray-11)]"/>
                      <Box>

                        <Text as="div" size="2" weight="bold">{t('lbl_edge_radius', 'Element Edge Radius')}</Text>
                        <Text as="div" size="1"
                              color="gray">{t('lbl_edge_radius_desc', 'Edge radius of elements, like buttons or cards')}</Text>
                      </Box>
                    </Flex>
                    <Select.Root value={radiusType}
                                 onValueChange={(val) => setRadiusType(val as ElementEdgeRadius)}>
                      <Select.Trigger/>
                      <Select.Content>
                        {(radiusTypes as ElementEdgeRadius[]).map(radius => (
                            <Select.Item key={radius} value={radius}>
                              {radius.charAt(0).toUpperCase() + radius.slice(1)}
                            </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Grid>

                  <Separator size="4"/>

                  <Grid columns="2" gap="4" align="center">
                    <Flex align="center" gap="3">
                      <Flame size={20} className="text-[var(--gray-11)]"/>
                      <Box>
                        <Text as="div" size="2" weight="bold">{t('lbl_button_glow', 'Button Glow')}</Text>
                        <Text as="div" size="1"
                              color="gray">{t('lbl_button_glow_desc', 'Enable or disable primary button glow effect')}</Text>
                      </Box>
                    </Flex>
                    <Select.Root>
                      <Select.Trigger/>
                      <Select.Content>
                        <Select.Item value="false" key="false">
                          <Flex align="center" gap="2">
                            <CircleX size={14}/> {t('lbl_off', 'Off')}
                          </Flex>
                        </Select.Item>
                        <Select.Item value="true" key="true">
                          <Flex align="center" gap="2">
                            <CircleCheck size={14}/> {t('lbl_on', 'On')}
                          </Flex>
                        </Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </Grid>

                </Flex>
              </Card>

              <Card size="3">
                <Flex direction="column" gap="4">
                  <Flex direction="row" gap="2">
                    <BookType size={24} color="var(--accent-11)"></BookType>
                    <Heading size="5" mb="2" className="">
                <span
                  className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
                  {t('settings.typography.title', 'Typography')}
                </span>
                    </Heading>
                  </Flex>
                  <Grid columns="2" gap="4" align="center">
                    <Flex align="center" gap="3">
                      <Type size={20} className="text-[var(--gray-11)]"/>
                      <Box>
                        <Text as="div" size="2" weight="bold">{t('settings.typography.defaultFont', 'Default Font')}</Text>
                        <Text as="div" size="1"
                              color="gray">{t('settings.typography.defaultFontDescription', 'Main font used across the application')}</Text>
                      </Box>
                    </Flex>
                    <Select.Root value={defaultFont} onValueChange={(val) => setDefaultFont(val as DefaultFont)}>
                      <Select.Trigger/>
                      <Select.Content>
                        {defaultFonts.map(font => (
                          <Select.Item key={font} value={font}>
                            <span style={{fontFamily: font}}>{font}</span>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Grid>

                  <Separator size="4"/>

                  <Grid columns="2" gap="4" align="center">
                    <Flex align="center" gap="3">
                      <Code size={20} className="text-[var(--gray-11)]"/>
                      <Box>
                        <Text as="div" size="2" weight="bold">{t('settings.typography.codeFont', 'Code Font')}</Text>
                        <Text as="div" size="1"
                              color="gray">{t('settings.typography.codeFontDescription', 'Monospace font for code editors and snippets')}</Text>
                      </Box>
                    </Flex>
                    <Select.Root value={codeFont} onValueChange={(val) => setCodeFont(val as CodeFont)}>
                      <Select.Trigger/>
                      <Select.Content>
                        {codeFonts.map(font => (
                          <Select.Item key={font} value={font} style={{fontFamily: font}}>
                            <span style={{fontFamily: font}}>{font}</span>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  </Grid>
                </Flex>
              </Card>

              <Card size="3">
                <Flex direction="column" gap="4">
                  <Flex direction="row" gap="2">
                    <Globe size={24} color="var(--accent-11)"></Globe>
                    <Heading size="4" mb="2">
                <span
                  className="bg-gradient-to-l from-[var(--gray-12)] to-[var(--accent-10)] bg-clip-text text-transparent">
              {t('settings.localization.title', 'Localization')}
              </span>
                    </Heading>
                  </Flex>

                  <Grid columns="2" gap="4" align="center">
                    <Flex align="center" gap="3">
                      <Languages size={20} className="text-[var(--gray-11)]"/>
                      <Box>
                        <Text as="div" size="2"
                              weight="bold">{t('settings.localization.defaultLanguage', 'Default Language')}</Text>
                        <Text as="div" size="1"
                              color="gray">{t('settings.localization.languageDescription', 'Interface language selection')}</Text>
                      </Box>
                    </Flex>
                    <Select.Root value={i18n.language || 'auto'} onValueChange={(val) => i18n.changeLanguage(val)}>
                      <Select.Trigger/>
                      <Select.Content>
                        <Select.Item value="auto">{t('settings.localization.languages.auto', 'Auto (Browser)')}</Select.Item>
                        <Select.Item value="en">{t('settings.localization.languages.en', 'English')}</Select.Item>
                        <Select.Item value="cs">{t('settings.localization.languages.cs', 'Czech')}</Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </Grid>
                </Flex>
              </Card>
            </Flex>
          </Tabs.Content>

          <Tabs.Content value="notifications">
             <Card size="3">
                <Flex direction="column" align="center" justify="center" py="8" gap="3">
                   <Bell size={48} color="var(--gray-8)" />
                   <Text color="gray">{t('msg_notifications_soon', 'Notification settings will be added here later')}</Text>
                </Flex>
             </Card>
          </Tabs.Content>
        </Tabs.Root>
      </Flex>
    </Box>
  );
};

export default SettingsPage;
