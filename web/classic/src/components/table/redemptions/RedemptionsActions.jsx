/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React from 'react';
import { Button, Modal, TextArea } from '@douyinfe/semi-ui';

const RedemptionsActions = ({
  selectedKeys,
  setEditingRedemption,
  setShowEdit,
  batchCopyRedemptions,
  batchDeleteRedemptions,
  redemptionCopyTemplate,
  showTemplateModal,
  setShowTemplateModal,
  saveRedemptionCopyTemplate,
  t,
}) => {
  const [templateDraft, setTemplateDraft] = React.useState(
    redemptionCopyTemplate,
  );

  React.useEffect(() => {
    setTemplateDraft(redemptionCopyTemplate);
  }, [redemptionCopyTemplate, showTemplateModal]);

  // Add new redemption code
  const handleAddRedemption = () => {
    setEditingRedemption({
      id: undefined,
    });
    setShowEdit(true);
  };

  return (
    <div className='flex flex-wrap gap-2 w-full md:w-auto order-2 md:order-1'>
      <Button
        type='primary'
        className='flex-1 md:flex-initial'
        onClick={handleAddRedemption}
        size='small'
      >
        {t('添加兑换码')}
      </Button>

      <Button
        type='tertiary'
        className='flex-1 md:flex-initial'
        onClick={batchCopyRedemptions}
        size='small'
      >
        {t('复制所选兑换码到剪贴板')}
      </Button>

      <Button
        type='danger'
        className='w-full md:w-auto'
        onClick={batchDeleteRedemptions}
        size='small'
      >
        {t('清除失效兑换码')}
      </Button>
      <Button
        type='tertiary'
        className='w-full md:w-auto'
        onClick={() => setShowTemplateModal(true)}
        size='small'
      >
        {t('兑换码模板')}
      </Button>

      <Modal
        title={t('兑换码模板')}
        visible={showTemplateModal}
        onCancel={() => setShowTemplateModal(false)}
        onOk={() => saveRedemptionCopyTemplate(templateDraft)}
        okText={t('保存')}
        cancelText={t('取消')}
        size='large'
      >
        <div className='flex flex-col gap-2'>
          <TextArea
            autosize={{ minRows: 5, maxRows: 10 }}
            value={templateDraft}
            onChange={setTemplateDraft}
            placeholder={t('请输入兑换码复制模板')}
          />
          <div className='text-xs text-gray-500'>
            {t('使用 {{code}} 作为兑换码占位符，复制时会自动替换为实际兑换码。')}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RedemptionsActions;
